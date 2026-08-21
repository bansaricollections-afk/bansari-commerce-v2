-- =============================================================================
-- Migration: 20260820010000_cashfree_rpc_persist_ids.sql
-- Purpose  : Teach create_order_with_items() to persist the Cashfree order and
--            payment identifiers ATOMICALLY, in the same INSERT that already
--            writes the order. Without this the cf_order_id / cf_payment_id
--            columns added in 20260820000000 would be silently dropped, because
--            the RPC inserts an explicit column list.
--
-- SCOPE:
--   * The ONLY change versus the current definition
--     (20260812120000_size_level_inventory_foundation.sql) is two added columns
--     in the INSERT list and two matching source expressions in the SELECT:
--         + cf_order_id   := p_order ->> 'cf_order_id'
--         + cf_payment_id := p_order ->> 'cf_payment_id'
--   * Every other line — authorization check, order_items insert, size-level
--     inventory decrement, inventory_transactions idempotency, grants/revokes —
--     is reproduced verbatim.
--
-- RAZORPAY SAFETY:
--   Razorpay callers do not put cf_order_id / cf_payment_id in p_order, so
--   `p_order ->> 'cf_order_id'` evaluates to NULL for them — identical to today.
--   No Razorpay column, value or code path changes.
--
-- CASHFREE ATOMICITY:
--   cf_order_id and cf_payment_id are written in the same INSERT ... SELECT as
--   the rest of the order row, inside the single function transaction. There is
--   no INSERT-then-UPDATE window in which an order could exist without its
--   Cashfree identifiers.
-- =============================================================================

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
    cf_order_id, cf_payment_id,
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
    p_order ->> 'cf_order_id',
    p_order ->> 'cf_payment_id',
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

-- Execution privileges are re-asserted identically to the prior definition:
-- only the service-role client (used by /api/orders/create and the Cashfree
-- verify route) may call this function.
revoke execute on function public.create_order_with_items(jsonb, jsonb) from public;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from anon;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from authenticated;
grant  execute on function public.create_order_with_items(jsonb, jsonb) to service_role;
