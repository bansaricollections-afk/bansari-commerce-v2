-- =============================================================================
-- INVENTORY MANAGEMENT SYSTEM V1
-- Bansari Commerce Pro
-- =============================================================================
-- Run order: this migration is additive and does not modify existing tables.
-- Depends on: products table (already exists)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PRODUCT VARIANTS
--    One row per sellable variant (size × colour combination).
--    Links to products.id.
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id              bigserial primary key,
  product_id      bigint        not null references public.products(id) on delete cascade,

  -- Identification
  sku             text          not null,
  barcode         text,

  -- Inventory counters (all stored as integers to avoid floating-point drift)
  stock_current   integer       not null default 0 check (stock_current >= 0),
  stock_reserved  integer       not null default 0 check (stock_reserved >= 0),
  stock_incoming  integer       not null default 0 check (stock_incoming >= 0),

  -- Reorder settings
  reorder_level   integer       not null default 5  check (reorder_level >= 0),
  reorder_qty     integer       not null default 10 check (reorder_qty > 0),

  -- Pricing (paise / smallest currency unit to avoid decimal issues)
  cost_price      numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price   numeric(12,2) not null default 0 check (selling_price >= 0),
  mrp             numeric(12,2) not null default 0 check (mrp >= 0),

  -- Physical attributes
  weight_grams    integer                check (weight_grams > 0),
  dimension_l_mm  integer                check (dimension_l_mm > 0),
  dimension_w_mm  integer                check (dimension_w_mm > 0),
  dimension_h_mm  integer                check (dimension_h_mm > 0),

  -- Variant attributes
  size            text,
  color           text,
  attributes      jsonb         not null default '{}',

  -- Status
  status          text          not null default 'active'
                    check (status in ('active','inactive','discontinued')),

  -- Audit
  created_by      uuid          references auth.users(id),
  updated_by      uuid          references auth.users(id),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- Unique SKU across the entire catalog
create unique index if not exists idx_product_variants_sku
  on public.product_variants(sku);

-- Lookup by product
create index if not exists idx_product_variants_product_id
  on public.product_variants(product_id);

-- Lookup by barcode
create index if not exists idx_product_variants_barcode
  on public.product_variants(barcode)
  where barcode is not null;

-- Low-stock alert index
create index if not exists idx_product_variants_low_stock
  on public.product_variants(stock_current)
  where stock_current <= reorder_level;

-- Status filter
create index if not exists idx_product_variants_status
  on public.product_variants(status);

comment on table public.product_variants is
  'Sellable product variants with full inventory tracking.';

-- ---------------------------------------------------------------------------
-- 2. INVENTORY LEDGER (movement history)
--    Immutable append-only log. Never update or delete rows.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_ledger (
  id              bigserial primary key,
  variant_id      bigint        not null references public.product_variants(id) on delete restrict,

  -- Movement classification
  movement_type   text          not null check (movement_type in (
    'stock_in',
    'stock_out',
    'sale',
    'order_reservation',
    'reservation_release',
    'manual_adjustment',
    'return',
    'cancellation',
    'damage',
    'lost'
  )),

  -- Quantity (positive = add, negative = remove)
  quantity        integer       not null,

  -- Snapshot of stock before and after this movement
  stock_before    integer       not null,
  stock_after     integer       not null,

  -- Context
  reason          text,
  reference_type  text,   -- 'order' | 'purchase_order' | 'return' | 'manual'
  reference_id    text,   -- external ID (order number, PO number, etc.)

  -- Audit
  created_by      uuid          references auth.users(id),
  created_at      timestamptz   not null default now()
);

create index if not exists idx_inventory_ledger_variant_id
  on public.inventory_ledger(variant_id);

create index if not exists idx_inventory_ledger_movement_type
  on public.inventory_ledger(movement_type);

create index if not exists idx_inventory_ledger_created_at
  on public.inventory_ledger(created_at desc);

create index if not exists idx_inventory_ledger_reference
  on public.inventory_ledger(reference_type, reference_id)
  where reference_id is not null;

comment on table public.inventory_ledger is
  'Immutable append-only log of every stock movement. Never update or delete.';

-- ---------------------------------------------------------------------------
-- 3. INVENTORY TRANSACTIONS
--    Groups ledger entries under a single business operation.
--    Supports rollback by cancelling a transaction (creates reversal entries).
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_transactions (
  id              bigserial primary key,
  status          text          not null default 'committed'
                    check (status in ('pending','committed','rolled_back')),
  note            text,
  reference_type  text,
  reference_id    text,
  created_by      uuid          references auth.users(id),
  created_at      timestamptz   not null default now(),
  committed_at    timestamptz,
  rolled_back_at  timestamptz
);

-- Link ledger entries to a transaction
alter table public.inventory_ledger
  add column if not exists transaction_id bigint
    references public.inventory_transactions(id) on delete set null;

create index if not exists idx_inventory_ledger_transaction_id
  on public.inventory_ledger(transaction_id)
  where transaction_id is not null;

create index if not exists idx_inventory_transactions_status
  on public.inventory_transactions(status);

create index if not exists idx_inventory_transactions_reference
  on public.inventory_transactions(reference_type, reference_id)
  where reference_id is not null;

comment on table public.inventory_transactions is
  'Groups one or more ledger entries into an atomic business operation.';

-- ---------------------------------------------------------------------------
-- 4. INVENTORY RESERVATIONS
--    Holds reserved stock while an order awaits payment.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_reservations (
  id              bigserial primary key,
  variant_id      bigint        not null references public.product_variants(id) on delete restrict,
  quantity        integer       not null check (quantity > 0),
  status          text          not null default 'active'
                    check (status in ('active','converted','released','expired')),
  order_ref       text,
  session_ref     text,
  expires_at      timestamptz   not null default (now() + interval '30 minutes'),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_inventory_reservations_variant_id
  on public.inventory_reservations(variant_id);

create index if not exists idx_inventory_reservations_status
  on public.inventory_reservations(status);

create index if not exists idx_inventory_reservations_expires_at
  on public.inventory_reservations(expires_at)
  where status = 'active';

create index if not exists idx_inventory_reservations_order_ref
  on public.inventory_reservations(order_ref)
  where order_ref is not null;

comment on table public.inventory_reservations is
  'Tracks stock reserved for pending orders. Released on cancellation or expiry.';

-- ---------------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------------

-- auto-update updated_at on product_variants
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_reservations_updated_at on public.inventory_reservations;
create trigger trg_inventory_reservations_updated_at
  before update on public.inventory_reservations
  for each row execute function public.set_updated_at();

-- Computed available stock: current - reserved (read-only via function)
create or replace function public.inventory_available_stock(v public.product_variants)
returns integer language sql stable as $$
  select greatest(v.stock_current - v.stock_reserved, 0);
$$;

-- ---------------------------------------------------------------------------
-- 6. ATOMIC STOCK ADJUSTMENT FUNCTION
--    Called from the service layer. Runs entirely inside the DB transaction,
--    guaranteeing no race condition.
-- ---------------------------------------------------------------------------
create or replace function public.inventory_adjust_stock(
  p_variant_id    bigint,
  p_quantity      integer,          -- positive = add, negative = remove
  p_movement_type text,
  p_reason        text    default null,
  p_reference_type text   default null,
  p_reference_id  text    default null,
  p_user_id       uuid    default null,
  p_transaction_id bigint default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_before   integer;
  v_after    integer;
  v_ledger_id bigint;
begin
  -- Lock the variant row to prevent concurrent writes
  select stock_current into v_before
    from public.product_variants
   where id = p_variant_id
     for update;

  if not found then
    raise exception 'Variant % not found', p_variant_id using errcode = 'P0001';
  end if;

  v_after := v_before + p_quantity;

  -- Prevent negative stock
  if v_after < 0 then
    raise exception 'Insufficient stock: current=%, requested=%', v_before, p_quantity
      using errcode = 'P0002';
  end if;

  -- Apply adjustment
  update public.product_variants
     set stock_current = v_after
   where id = p_variant_id;

  -- Append ledger entry
  insert into public.inventory_ledger (
    variant_id, movement_type, quantity,
    stock_before, stock_after, reason,
    reference_type, reference_id,
    created_by, transaction_id
  ) values (
    p_variant_id, p_movement_type, p_quantity,
    v_before, v_after, p_reason,
    p_reference_type, p_reference_id,
    p_user_id, p_transaction_id
  ) returning id into v_ledger_id;

  return jsonb_build_object(
    'ledger_id',    v_ledger_id,
    'stock_before', v_before,
    'stock_after',  v_after
  );
end;
$$;

grant execute on function public.inventory_adjust_stock to service_role;

-- ---------------------------------------------------------------------------
-- 7. ATOMIC RESERVATION FUNCTION
-- ---------------------------------------------------------------------------
create or replace function public.inventory_reserve(
  p_variant_id  bigint,
  p_quantity    integer,
  p_order_ref   text    default null,
  p_session_ref text    default null,
  p_ttl_minutes integer default 30
)
returns bigint   -- reservation id
language plpgsql
security definer
as $$
declare
  v_available  integer;
  v_reservation_id bigint;
begin
  -- Lock and check availability
  select greatest(stock_current - stock_reserved, 0) into v_available
    from public.product_variants
   where id = p_variant_id
     for update;

  if not found then
    raise exception 'Variant % not found', p_variant_id using errcode = 'P0001';
  end if;

  if v_available < p_quantity then
    raise exception 'Cannot reserve %: only % available', p_quantity, v_available
      using errcode = 'P0003';
  end if;

  -- Increment reserved counter
  update public.product_variants
     set stock_reserved = stock_reserved + p_quantity
   where id = p_variant_id;

  -- Create reservation record
  insert into public.inventory_reservations (
    variant_id, quantity, order_ref, session_ref,
    expires_at
  ) values (
    p_variant_id, p_quantity, p_order_ref, p_session_ref,
    now() + (p_ttl_minutes || ' minutes')::interval
  ) returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

grant execute on function public.inventory_reserve to service_role;

-- ---------------------------------------------------------------------------
-- 8. RELEASE RESERVATION FUNCTION
-- ---------------------------------------------------------------------------
create or replace function public.inventory_release_reservation(
  p_reservation_id bigint,
  p_status text default 'released'  -- 'released' | 'converted' | 'expired'
)
returns void
language plpgsql
security definer
as $$
declare
  v_qty       integer;
  v_variant   bigint;
  v_cur_status text;
begin
  select quantity, variant_id, status
    into v_qty, v_variant, v_cur_status
    from public.inventory_reservations
   where id = p_reservation_id
     for update;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id using errcode = 'P0001';
  end if;

  if v_cur_status <> 'active' then
    return;  -- idempotent — already processed
  end if;

  -- Decrement reserved counter
  update public.product_variants
     set stock_reserved = greatest(stock_reserved - v_qty, 0)
   where id = v_variant;

  -- Mark reservation
  update public.inventory_reservations
     set status = p_status, updated_at = now()
   where id = p_reservation_id;
end;
$$;

grant execute on function public.inventory_release_reservation to service_role;

-- ---------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.product_variants         enable row level security;
alter table public.inventory_ledger         enable row level security;
alter table public.inventory_transactions   enable row level security;
alter table public.inventory_reservations   enable row level security;

-- Service role bypasses RLS by default (superuser context)
-- Admin authenticated users: read all
create policy "admin_read_variants" on public.product_variants
  for select using (
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "service_role_variants" on public.product_variants
  for all using (true)
  with check (true);

create policy "admin_read_ledger" on public.inventory_ledger
  for select using (
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "service_role_ledger" on public.inventory_ledger
  for all using (true)
  with check (true);

create policy "admin_read_transactions" on public.inventory_transactions
  for select using (
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "service_role_transactions" on public.inventory_transactions
  for all using (true)
  with check (true);

create policy "admin_read_reservations" on public.inventory_reservations
  for select using (
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "service_role_reservations" on public.inventory_reservations
  for all using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 10. VIEWS
-- ---------------------------------------------------------------------------

create or replace view public.v_inventory_summary as
select
  pv.id                                          as variant_id,
  pv.product_id,
  p.name                                         as product_name,
  p.category,
  p.collection,
  pv.sku,
  pv.barcode,
  pv.size,
  pv.color,
  pv.status,
  pv.stock_current,
  pv.stock_reserved,
  greatest(pv.stock_current - pv.stock_reserved, 0) as stock_available,
  pv.stock_incoming,
  pv.reorder_level,
  pv.reorder_qty,
  pv.cost_price,
  pv.selling_price,
  pv.mrp,
  pv.selling_price * pv.stock_current             as inventory_value,
  case
    when pv.stock_current = 0 then 'out_of_stock'
    when greatest(pv.stock_current - pv.stock_reserved, 0) <= pv.reorder_level then 'low_stock'
    else 'in_stock'
  end                                             as stock_status,
  pv.created_at,
  pv.updated_at
from public.product_variants pv
join public.products p on p.id = pv.product_id;

comment on view public.v_inventory_summary is
  'Denormalised view joining variants with product names for the admin dashboard.';
