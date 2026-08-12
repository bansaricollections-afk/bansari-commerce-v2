-- ============================================================================
-- Size-level inventory foundation
-- ============================================================================
-- Establishes product_variants as the single inventory authority at SIZE
-- granularity, adds the size-semantic metadata layer, closes the variant
-- referential-integrity gaps, and makes order placement decrement the exact
-- purchased variant atomically.
--
-- DELIBERATELY NOT DONE HERE:
--   * No variants are created for existing products.
--   * No stock quantity is invented, split, redistributed or backfilled.
--   * products.stock and products.sizes[] are left untouched (legacy path).
--
-- ACTIVATION SEMANTIC (important):
--   A product is "size-managed" only once it has at least one active variant.
--   Products with zero variants keep the existing product-level behaviour, so
--   this migration is a no-op for the current catalogue until stock is entered
--   per size from the admin UI.
--
-- Every statement is idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Size semantic (metadata only — never drives inventory)
-- ---------------------------------------------------------------------------
alter table public.size_master
  add column if not exists size_semantic text not null default 'UNCLASSIFIED';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.size_master'::regclass
       and conname  = 'size_master_size_semantic_check'
  ) then
    alter table public.size_master
      add constraint size_master_size_semantic_check
      check (size_semantic in ('REGULAR', 'PLUS', 'FREE_SIZE', 'UNCLASSIFIED'));
  end if;
end $$;

-- Only the one unambiguous classification is seeded. REGULAR / PLUS are a
-- merchandising judgement and are left UNCLASSIFIED for the admin to set.
update public.size_master
   set size_semantic = 'FREE_SIZE'
 where lower(label) in ('free', 'free size', 'one size')
   and size_semantic = 'UNCLASSIFIED';

-- ---------------------------------------------------------------------------
-- 2. product_variants — inventory invariants + size uniqueness
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.product_variants'::regclass
       and conname  = 'product_variants_stock_non_negative'
  ) then
    alter table public.product_variants
      add constraint product_variants_stock_non_negative check (stock >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.product_variants'::regclass
       and conname  = 'product_variants_reserved_non_negative'
  ) then
    alter table public.product_variants
      add constraint product_variants_reserved_non_negative check (reserved_stock >= 0);
  end if;
end $$;

-- One live variant per (product, size, colour). Soft-deleted rows excluded so
-- a size can be retired and re-added without collision.
create unique index if not exists product_variants_product_size_color_udx
  on public.product_variants (product_id, size_id, coalesce(color_id, 0))
  where deleted_at is null;

-- Availability lookups for the storefront grid (one query for many products).
create index if not exists product_variants_product_live_idx
  on public.product_variants (product_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Variant referential integrity on the satellite inventory tables
--    (all of these are empty in production — adding the FKs cannot fail)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.inventory_stock'::regclass
                    and conname  = 'inventory_stock_variant_id_fkey') then
    alter table public.inventory_stock
      add constraint inventory_stock_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.inventory_movements'::regclass
                    and conname  = 'inventory_movements_variant_id_fkey') then
    alter table public.inventory_movements
      add constraint inventory_movements_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.stock_alerts'::regclass
                    and conname  = 'stock_alerts_variant_id_fkey') then
    alter table public.stock_alerts
      add constraint stock_alerts_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.inventory_reservations'::regclass
                    and conname  = 'inventory_reservations_variant_id_fkey') then
    alter table public.inventory_reservations
      add constraint inventory_reservations_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id) on delete restrict;
  end if;

  -- Reservations pointed at the retired orders_v2 table; repoint at orders.
  if exists (select 1 from pg_constraint
              where conrelid = 'public.inventory_reservations'::regclass
                and conname  = 'inventory_reservations_order_id_fkey') then
    alter table public.inventory_reservations
      drop constraint inventory_reservations_order_id_fkey;
  end if;

  alter table public.inventory_reservations
    add constraint inventory_reservations_order_id_fkey
    foreign key (order_id) references public.orders(id) on delete cascade;

  -- reserved can never exceed on-hand in the satellite model either.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.inventory_stock'::regclass
                    and conname  = 'inventory_stock_reserved_lte_quantity') then
    alter table public.inventory_stock
      add constraint inventory_stock_reserved_lte_quantity check (reserved <= quantity);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Canonical availability projection
--    available = stock - reserved_stock (never negative)
-- ---------------------------------------------------------------------------
create or replace view public.v_product_size_availability as
  select
    v.product_id,
    v.id                                          as variant_id,
    v.sku,
    v.size_id,
    s.label                                       as size_label,
    s.sort_order,
    s.size_semantic,
    s.active                                      as size_active,
    v.status,
    v.stock,
    v.reserved_stock,
    greatest(v.stock - v.reserved_stock, 0)       as available
  from public.product_variants v
  join public.size_master s on s.id = v.size_id
  where v.deleted_at is null;

revoke all on public.v_product_size_availability from public;
revoke all on public.v_product_size_availability from anon;
revoke all on public.v_product_size_availability from authenticated;
grant select on public.v_product_size_availability to service_role;

-- ---------------------------------------------------------------------------
-- 5. Order placement — persist the purchased variant AND decrement it
--    atomically inside the same transaction.
--
--    Unchanged from the live version: signature, SECURITY INVOKER, the
--    search_path pin, the auth.uid() ownership assertion, the orders insert
--    column mapping, and the service_role-only EXECUTE grant.
--    Changed: order_items now carries variant identity, and variant stock is
--    decremented under a row lock so two buyers cannot take the same last unit.
-- ---------------------------------------------------------------------------
create or replace function public.create_order_with_items(p_order jsonb, p_items jsonb)
returns orders
language plpgsql
set search_path = public
as $function$
DECLARE
  v_order            public.orders;
  v_supplied_user_id uuid := NULLIF(p_order ->> 'user_id', '')::uuid;
  v_line             record;
  v_stock            integer;
  v_reserved         integer;
BEGIN
  -- Defense-in-depth: an authenticated caller may only create an order for
  -- themselves. Guest checkout (v_supplied_user_id IS NULL) and service-role
  -- execution (auth.uid() IS NULL — no end-user JWT in that context) are
  -- both unaffected by this check.
  IF auth.uid() IS NOT NULL
     AND v_supplied_user_id IS NOT NULL
     AND v_supplied_user_id <> auth.uid()
  THEN
    RAISE EXCEPTION 'user_id mismatch: cannot create an order for another user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.orders (
    order_number, user_id,
    customer_name, customer_email, customer_phone,
    shipping_address,
    currency,
    subtotal, discount, shipping, tax, total,
    payment_provider, payment_method, payment_reference,
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    payment_status, order_status,
    payment_verified_at, paid_at,
    items
  )
  SELECT
    p_order ->> 'order_number',
    v_supplied_user_id,
    p_order ->> 'customer_name',
    p_order ->> 'customer_email',
    p_order ->> 'customer_phone',
    p_order -> 'shipping_address',
    COALESCE(p_order ->> 'currency', 'INR'),
    (p_order ->> 'subtotal')::numeric,
    (p_order ->> 'discount')::numeric,
    (p_order ->> 'shipping_fee')::numeric,
    (p_order ->> 'tax')::numeric,
    (p_order ->> 'grand_total')::numeric,
    COALESCE(p_order ->> 'payment_provider', 'razorpay'),
    p_order ->> 'payment_method',
    p_order ->> 'payment_reference',
    p_order ->> 'razorpay_order_id',
    p_order ->> 'razorpay_payment_id',
    p_order ->> 'razorpay_signature',
    p_order ->> 'payment_status',
    p_order ->> 'order_status',
    (p_order ->> 'payment_verified_at')::timestamptz,
    (p_order ->> 'paid_at')::timestamptz,
    COALESCE(p_items, '[]'::jsonb)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_slug, product_sku,
    product_image, variant_color, variant_size,
    unit_price, quantity, line_total,
    variant_id, variant_sku, mrp,
    returned_quantity, exchanged_quantity, is_gift, gift_message
  )
  SELECT
    v_order.id,
    (item ->> 'product_id')::bigint,
    item ->> 'product_name',
    item ->> 'product_slug',
    item ->> 'product_sku',
    item ->> 'product_image',
    NULLIF(item ->> 'variant_color', ''),
    NULLIF(item ->> 'variant_size', ''),
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total')::numeric,
    NULLIF(item ->> 'variant_id', '')::bigint,
    NULLIF(item ->> 'variant_sku', ''),
    NULL,
    0,
    0,
    FALSE,
    NULL
  FROM jsonb_array_elements(p_items) AS item;

  -- ── Size-level inventory: decrement the exact purchased variant ──────────
  -- Rows are locked in variant-id order so concurrent multi-line orders can
  -- never deadlock, and the availability check happens under that lock.
  FOR v_line IN
    SELECT NULLIF(item ->> 'variant_id', '')::bigint AS variant_id,
           SUM((item ->> 'quantity')::integer)       AS qty
      FROM jsonb_array_elements(p_items) AS item
     WHERE NULLIF(item ->> 'variant_id', '') IS NOT NULL
     GROUP BY 1
     ORDER BY 1
  LOOP
    SELECT stock, reserved_stock
      INTO v_stock, v_reserved
      FROM public.product_variants
     WHERE id = v_line.variant_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % does not exist.', v_line.variant_id
        USING ERRCODE = 'P0001';
    END IF;

    IF (v_stock - v_reserved) < v_line.qty THEN
      RAISE EXCEPTION 'Insufficient stock for variant %. Available: %, requested: %.',
        v_line.variant_id, (v_stock - v_reserved), v_line.qty
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.product_variants
       SET stock      = stock - v_line.qty,
           updated_at = now()
     WHERE id = v_line.variant_id;

    INSERT INTO public.inventory_transactions (
      variant_id, movement_type, quantity,
      previous_stock, new_stock, previous_reserved, new_reserved,
      order_id, reason, idempotency_key
    )
    VALUES (
      v_line.variant_id, 'sale', v_line.qty,
      v_stock, v_stock - v_line.qty, v_reserved, v_reserved,
      v_order.id, 'order_placed',
      'order_sale:' || v_order.id || ':' || v_line.variant_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  RETURN v_order;
END;
$function$;

revoke execute on function public.create_order_with_items(jsonb, jsonb) from public;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from anon;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from authenticated;
grant  execute on function public.create_order_with_items(jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Admin stock write — single authoritative, audited entry point
-- ---------------------------------------------------------------------------
create or replace function public.set_variant_stock(
  p_variant_id bigint,
  p_stock      integer,
  p_actor_id   uuid  default null,
  p_actor_name text  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock    integer;
  v_reserved integer;
begin
  if p_stock < 0 then
    raise exception 'Stock cannot be negative.' using errcode = 'P0001';
  end if;

  select stock, reserved_stock
    into v_stock, v_reserved
    from public.product_variants
   where id = p_variant_id
     for update;

  if not found then
    raise exception 'Variant % does not exist.', p_variant_id using errcode = 'P0001';
  end if;

  if p_stock < v_reserved then
    raise exception
      'Stock (%) cannot be lower than the % unit(s) already reserved.', p_stock, v_reserved
      using errcode = 'P0002';
  end if;

  if p_stock = v_stock then
    return;
  end if;

  update public.product_variants
     set stock = p_stock, updated_at = now()
   where id = p_variant_id;

  insert into public.inventory_transactions (
    variant_id, movement_type, quantity,
    previous_stock, new_stock, previous_reserved, new_reserved,
    actor_id, actor_name, reason
  )
  values (
    p_variant_id, 'adjustment', p_stock - v_stock,
    v_stock, p_stock, v_reserved, v_reserved,
    p_actor_id, p_actor_name, 'admin_stock_set'
  );
end;
$$;

revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from public;
revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from anon;
revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from authenticated;
grant  execute on function public.set_variant_stock(bigint, integer, uuid, text) to service_role;
