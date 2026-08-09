-- Production hotfix capture: create_order_with_items wrote order lines to
-- public.order_items, a table that was never created (see
-- 20260716010000_inventory_and_payment_constraints.sql's comment header,
-- which assumed order_items existed). public.orders.items (jsonb, NOT NULL,
-- no default) is the actual live column for order line data. Every call to
-- create_order_with_items failed until this was corrected directly in
-- production; this migration reproduces that verified production fix so
-- fresh/other environments match.
--
-- CREATE OR REPLACE is sufficient here — signature and return type
-- (p_order jsonb, p_items jsonb) RETURNS public.orders are unchanged from
-- the original definition in 20260708140000_orders_integrity.sql, so no
-- DROP FUNCTION is required.
--
-- Only two changes from the original:
--   1. `items` added to the orders INSERT column/value list, sourced from
--      p_items.
--   2. The `insert into public.order_items (...)` block removed.
-- Everything else — field mapping, transaction semantics, security
-- characteristics — is unchanged.
create or replace function public.create_order_with_items(
  p_order jsonb,
  p_items jsonb
)
returns public.orders
language plpgsql
as $$
declare
  v_order public.orders;
begin
  insert into public.orders (
    order_number, user_id,
    customer_name, customer_email, customer_phone,
    shipping_name, shipping_phone, shipping_email,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code,
    billing_same_as_shipping,
    currency, subtotal, discount, shipping_fee, tax, grand_total,
    payment_provider, payment_method, payment_reference,
    razorpay_order_id, razorpay_payment_id, payment_status,
    order_status, payment_verified_at, paid_at,
    items
  )
  select
    p_order ->> 'order_number',
    nullif(p_order ->> 'user_id', '')::uuid,
    p_order ->> 'customer_name',
    p_order ->> 'customer_email',
    p_order ->> 'customer_phone',
    p_order ->> 'shipping_name',
    p_order ->> 'shipping_phone',
    p_order ->> 'shipping_email',
    p_order ->> 'shipping_address_line1',
    p_order ->> 'shipping_address_line2',
    p_order ->> 'shipping_city',
    p_order ->> 'shipping_state',
    p_order ->> 'shipping_postal_code',
    coalesce((p_order ->> 'billing_same_as_shipping')::boolean, true),
    p_order ->> 'currency',
    (p_order ->> 'subtotal')::numeric,
    (p_order ->> 'discount')::numeric,
    (p_order ->> 'shipping_fee')::numeric,
    (p_order ->> 'tax')::numeric,
    (p_order ->> 'grand_total')::numeric,
    p_order ->> 'payment_provider',
    p_order ->> 'payment_method',
    p_order ->> 'payment_reference',
    p_order ->> 'razorpay_order_id',
    p_order ->> 'razorpay_payment_id',
    p_order ->> 'payment_status',
    p_order ->> 'order_status',
    (p_order ->> 'payment_verified_at')::timestamptz,
    (p_order ->> 'paid_at')::timestamptz,
    coalesce(p_items, '[]'::jsonb)
  returning * into v_order;

  return v_order;
end;
$$;
