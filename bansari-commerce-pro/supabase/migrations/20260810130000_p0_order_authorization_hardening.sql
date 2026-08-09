-- P0 security fix: eliminate confirmed live vulnerabilities.
--
-- 1. orders had "Authenticated users can manage orders" (FOR ALL, USING true,
--    WITH CHECK true) — any logged-in customer could read/update/delete any
--    order. Replaced with owner-scoped SELECT for customers and an
--    app_metadata-role-gated ALL policy for admins.
-- 2. create_order_with_items() is executed only via the service-role client
--    everywhere in the codebase (orders/create/route.ts, order.service.ts,
--    order-v2.service.ts) — direct PUBLIC/anon/authenticated EXECUTE was an
--    unused, unnecessary bypass around the app's Razorpay signature check.
--    Grants are now restricted to service_role. An auth.uid() ownership
--    assertion is added as defense-in-depth for any future authenticated
--    caller; guest checkout (user_id NULL) and service-role calls
--    (auth.uid() NULL, no JWT context) are both unaffected.
-- 3. get_fulfillment_metrics(), generate_invoice_number(), and
--    generate_packing_slip_number() are likewise only ever called via the
--    service-role client (fulfillment.service.ts, order-v2.service.ts) —
--    PUBLIC/anon/authenticated EXECUTE grants removed.
-- 4. order_timeline and order_shipments had "authenticated ... USING (true)"
--    SELECT policies — any logged-in customer could read any other
--    customer's shipment/tracking and internal order-event data. Replaced
--    with owner-scoped EXISTS checks plus an admin app_metadata-role policy.

-- ---------------------------------------------------------------------
-- 1. orders
-- ---------------------------------------------------------------------

drop policy if exists "Authenticated users can manage orders" on public.orders;

create policy "orders_customer_select_own"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "orders_admin_all"
  on public.orders
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No INSERT/UPDATE/DELETE policy for non-admin authenticated customers:
-- order creation continues exclusively through create_order_with_items()
-- called by the server's service-role client (which bypasses RLS), and
-- service_role has rolbypassrls = true so it needs no explicit policy here.

-- ---------------------------------------------------------------------
-- 2. create_order_with_items — ownership assertion + search_path hardening
-- ---------------------------------------------------------------------

create or replace function public.create_order_with_items(p_order jsonb, p_items jsonb)
returns orders
language plpgsql
set search_path = public
as $function$
DECLARE
  v_order public.orders;
  v_supplied_user_id uuid := NULLIF(p_order ->> 'user_id', '')::uuid;
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
    NULL,
    NULL,
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total')::numeric,
    NULL,
    NULL,
    NULL,
    0,
    0,
    FALSE,
    NULL
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_order;
END;
$function$;

revoke execute on function public.create_order_with_items(jsonb, jsonb) from public;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from anon;
revoke execute on function public.create_order_with_items(jsonb, jsonb) from authenticated;
grant execute on function public.create_order_with_items(jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 3. get_fulfillment_metrics / generate_invoice_number /
--    generate_packing_slip_number — restrict to service_role only.
--    (Called exclusively via createServiceRoleClient() in
--    fulfillment.service.ts and order-v2.service.ts.)
-- ---------------------------------------------------------------------

revoke execute on function public.get_fulfillment_metrics() from public;
revoke execute on function public.get_fulfillment_metrics() from anon;
revoke execute on function public.get_fulfillment_metrics() from authenticated;
grant execute on function public.get_fulfillment_metrics() to service_role;

revoke execute on function public.generate_invoice_number() from public;
revoke execute on function public.generate_invoice_number() from anon;
revoke execute on function public.generate_invoice_number() from authenticated;
grant execute on function public.generate_invoice_number() to service_role;

revoke execute on function public.generate_packing_slip_number() from public;
revoke execute on function public.generate_packing_slip_number() from anon;
revoke execute on function public.generate_packing_slip_number() from authenticated;
grant execute on function public.generate_packing_slip_number() to service_role;

-- ---------------------------------------------------------------------
-- 4. order_timeline / order_shipments — owner-scoped read access
-- ---------------------------------------------------------------------

drop policy if exists "order_timeline_auth_read" on public.order_timeline;

create policy "order_timeline_owner_read"
  on public.order_timeline
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_timeline.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "order_timeline_admin_read"
  on public.order_timeline
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "order_shipments_auth_read" on public.order_shipments;

create policy "order_shipments_owner_read"
  on public.order_shipments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_shipments.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "order_shipments_admin_read"
  on public.order_shipments
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
