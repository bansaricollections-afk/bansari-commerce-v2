-- P0: enforce Razorpay payment idempotency at the database level.
-- The application already catches Postgres error 23505 on
-- razorpay_payment_id conflicts, but no unique index currently
-- exists in production to actually raise that error.
create unique index if not exists orders_razorpay_payment_id_unique_idx
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;
