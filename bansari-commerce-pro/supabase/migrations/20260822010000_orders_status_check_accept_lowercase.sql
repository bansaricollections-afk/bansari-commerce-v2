-- 20260822010000_orders_status_check_accept_lowercase
-- ---------------------------------------------------
-- Second production incident, same day: with the ON CONFLICT index fixed
-- (20260822000000), the checkout snapshot persisted and the customer paid —
-- but the order INSERT was then rejected with
--
--   new row for relation "orders" violates check constraint
--   "orders_order_status_check"
--
-- Root cause
--   Production's constraints require CAPITALISED status values:
--     order_status   IN ('Placed','Processing','Packed','Shipped','Delivered','Cancelled')
--     payment_status IN ('Pending','Paid','Failed')
--
--   The application writes LOWERCASE everywhere. src/services/order.service.ts
--   defines ORDER_STATUSES as lowercase and maps to capitalised strings only
--   for display (ORDER_STATUS_LABELS). Every write path inserts lowercase:
--     - src/app/api/orders/create/route.ts   (Razorpay checkout)
--     - src/services/order.service.ts        (Razorpay webhook recovery)
--     - src/lib/cashfree-order.ts            (Cashfree)
--     - src/services/order-v2.service.ts     (admin lifecycle transitions)
--
--   So this is NOT Cashfree-specific: Razorpay order creation and every admin
--   status transition violate the same constraints. The constraints predate the
--   application's move to lowercase statuses and were never migrated — these
--   constraints exist only in the production database and in no local
--   migration.
--
-- Fix
--   Widen both constraints to accept lowercase AND capitalised values. This is
--   deliberately non-destructive: ADD CONSTRAINT validates existing rows, and
--   any historical row already carrying a capitalised value stays valid. No
--   order data is read, rewritten or deleted.
--
-- Follow-up (NOT done here, needs a decision on live order data)
--   The application compares order_status against lowercase values, so any
--   existing capitalised row is already being misread by admin filters and
--   lifecycle transitions. Normalising existing rows to lowercase and then
--   tightening these constraints back to lowercase-only is the correct end
--   state, but it rewrites real order history and must be done deliberately.

begin;

alter table public.orders
  drop constraint if exists orders_order_status_check;

alter table public.orders
  add constraint orders_order_status_check
  check (order_status = any (array[
    'placed','processing','packed','shipped','delivered','cancelled',
    'Placed','Processing','Packed','Shipped','Delivered','Cancelled'
  ]));

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status = any (array[
    'pending','paid','failed',
    'Pending','Paid','Failed'
  ]));

commit;
