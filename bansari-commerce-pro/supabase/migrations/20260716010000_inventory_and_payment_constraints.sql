-- ============================================================
-- P0 Migration: inventory RPC + payment idempotency constraint
-- ============================================================
-- Depends on: 20260702001523_initial_schema.sql  (products table)
--             20260706130000_orders_schema.sql    (orders table)
-- ============================================================

-- ----------------------------------------------------------
-- 1.  decrement_product_stock
--
--     Called by /api/orders/create after create_order_with_items
--     commits.  Intentionally NOT inside the order transaction
--     (see route comment) — payment was already captured by
--     Razorpay before this route runs, so a stock shortfall
--     must not roll back a confirmed, paid order.
--
--     Safety properties:
--       • stock floor is 0  — never goes negative
--       • only updates active products
--       • single atomic UPDATE — safe against concurrent orders
--       • SECURITY DEFINER — runs as the migration owner, not
--         the calling role; the service-role client already
--         bypasses RLS but this keeps the function usable even
--         if the caller changes in future.
--       • CREATE OR REPLACE — idempotent; safe to re-apply
-- ----------------------------------------------------------
create or replace function public.decrement_product_stock(
  p_product_id bigint,
  p_quantity   integer
)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity <= 0 then
    raise exception 'p_quantity must be a positive integer, got %', p_quantity;
  end if;

  return query
  update public.products
     set stock      = greatest(0, stock - p_quantity),
         updated_at = now()
   where id     = p_product_id
     and active = true
  returning *;
end;
$$;

-- ----------------------------------------------------------
-- 2.  UNIQUE partial index on orders.razorpay_payment_id
--
--     Enforces that no two order rows share the same Razorpay
--     payment ID.  Partial (WHERE NOT NULL) so that orders
--     created via other payment methods — or future COD orders
--     — can still have a NULL payment id without conflicting.
--
--     This is the actual race-safe idempotency guarantee that
--     the 23505 catch in /api/orders/create/route.ts relies on.
--     CREATE UNIQUE INDEX IF NOT EXISTS — idempotent.
-- ----------------------------------------------------------
create unique index if not exists orders_razorpay_payment_id_udx
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;
