-- 20260822000000_fix_pending_orders_cf_order_id_upsert_index
-- ----------------------------------------------------------
-- Fixes a production incident: every Cashfree checkout took the customer's
-- money but created no order.
--
-- Root cause
--   Migration 20260820000000 created pending_orders_cf_order_id_udx as a
--   PARTIAL unique index (`where cf_order_id is not null`). The create-order
--   route persists the checkout snapshot with
--   `.upsert(..., { onConflict: 'cf_order_id' })`, which emits a bare
--   `ON CONFLICT (cf_order_id)`.
--
--   PostgreSQL cannot infer a partial unique index from a bare ON CONFLICT
--   target — the index predicate must also be restated in the statement, which
--   supabase-js cannot express. Every insert therefore failed with
--   SQLSTATE 42P10 ("there is no unique or exclusion constraint matching the
--   ON CONFLICT specification"), so the pending_orders snapshot was never
--   written.
--
--   Cashfree then charged the customer and fired PAYMENT_SUCCESS_WEBHOOK, but
--   both the webhook and the browser verify path look the checkout up by
--   pending_orders.cf_order_id, found nothing, and returned PENDING_NOT_FOUND.
--   Result: payment captured, no order, no inventory decrement, no email.
--
-- Fix
--   Recreate the index WITHOUT the predicate, matching the Razorpay index
--   (pending_orders_razorpay_order_id_udx) that has always worked. As
--   20260820000000's own comments note, PostgreSQL treats NULLs as distinct in
--   a unique index, so the many rows legitimately carrying NULL cf_order_id
--   (every Razorpay row) remain exempt from the uniqueness check. Dropping the
--   predicate costs nothing and restores ON CONFLICT inference.
--
--   orders_cf_payment_id_udx is deliberately left partial: it is never an
--   ON CONFLICT target. cashfree-order.ts inserts through the
--   create_order_with_items RPC and catches unique violations via SQLSTATE
--   23505, which works with a partial index.
--
--   Purely additive to Razorpay: no Razorpay column, index, constraint or row
--   is read or modified.

begin;

drop index if exists public.pending_orders_cf_order_id_udx;

-- Non-partial, so `ON CONFLICT (cf_order_id)` can infer it.
create unique index if not exists pending_orders_cf_order_id_udx
  on public.pending_orders (cf_order_id);

commit;
