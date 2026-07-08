-- Atomically creates one order and all of its order_items in a single
-- transaction.
--
-- The previous approach did two separate round-trips from application code
-- (insert order, then insert items) with a manual compensating delete if
-- the second insert failed. That has a real gap: if the process crashes
-- or the connection drops between those two calls, the compensating delete
-- never runs and the order is orphaned for real. Wrapping both inserts in
-- one PL/pgSQL function closes this — a function call gets an implicit
-- transaction, so any failure inside (a constraint violation, the unique
-- razorpay_payment_id collision, anything) rolls back everything the
-- function did. There is no window in which a partial order can exist.
--
-- Deliberately NOT included here: inventory decrement. By the time this
-- function would be called, Razorpay has already captured payment — an
-- external, irreversible side effect this transaction cannot roll back.
-- If stock decrement lived inside this same transaction, a stock shortfall
-- would abort order creation for a payment that already succeeded, leaving
-- a customer who paid with no order record at all. Stock decrement stays a
-- separate, deliberately best-effort step performed after this function
-- succeeds, exactly as implemented in the prior migration's
-- decrement_product_stock().
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
    order_status, payment_verified_at, paid_at
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
    (p_order ->> 'paid_at')::timestamptz
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_name, product_slug, product_sku,
    product_image, variant_color, variant_size,
    unit_price, quantity, line_total
  )
  select
    v_order.id,
    (item ->> 'product_id')::bigint,
    item ->> 'product_name',
    item ->> 'product_slug',
    item ->> 'product_sku',
    item ->> 'product_image',
    item ->> 'variant_color',
    item ->> 'variant_size',
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_order;
end;
$$;