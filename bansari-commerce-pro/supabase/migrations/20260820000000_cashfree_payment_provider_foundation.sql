-- =============================================================================
-- Migration: 20260820000000_cashfree_payment_provider_foundation.sql
-- Purpose  : Additive schema foundation for the Razorpay TEST -> Cashfree LIVE
--            migration. Adds Cashfree payment identifiers and a provider
--            discriminator to orders and pending_orders, and the unique
--            indexes that give Cashfree the same double-charge / duplicate
--            protection Razorpay already has.
--
-- SAFETY (Phase 5B):
--   * Purely additive. No Razorpay column, index, constraint or row is
--     dropped, renamed or rewritten. Razorpay remains the live rollback path.
--   * Every existing order and pending_order stays valid: the only change to
--     an existing column is relaxing a NOT NULL (see section 2), which cannot
--     invalidate any row that already holds a value.
--   * Idempotent: every statement uses IF NOT EXISTS / IF EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
-- payment_provider is NOT NULL DEFAULT 'razorpay' deliberately:
--   * Existing rows backfill to 'razorpay' — which is what they are.
--   * The existing (unchanged) Razorpay code path inserts no provider value,
--     so new Razorpay orders keep landing as 'razorpay' with zero code change.
--   * The future Cashfree code path MUST set payment_provider = 'cashfree'
--     explicitly; it never relies on the default.
-- Adding a column with a constant default is a metadata-only operation on
-- PostgreSQL 11+, so no table rewrite occurs on orders/pending_orders.

alter table public.orders
  add column if not exists cf_order_id       text,
  add column if not exists cf_payment_id     text,
  add column if not exists payment_provider  text not null default 'razorpay';

alter table public.pending_orders
  add column if not exists cf_order_id       text,
  add column if not exists payment_provider  text not null default 'razorpay';

-- ---------------------------------------------------------------------------
-- 2. Relax pending_orders.razorpay_order_id NOT NULL
-- ---------------------------------------------------------------------------
-- pending_orders.razorpay_order_id was created NOT NULL because, until now,
-- every pending order was a Razorpay order. A Cashfree pending order has no
-- razorpay_order_id, so the column must become nullable for Cashfree rows to
-- be insertable.
--
-- This is the one change to an existing Razorpay column. It is non-destructive:
--   * No existing row is affected — they all already hold a value.
--   * The existing unique index pending_orders_razorpay_order_id_udx is NOT
--     partial, but PostgreSQL treats NULLs as distinct in a unique index, so
--     multiple Cashfree rows carrying NULL razorpay_order_id never collide,
--     while Razorpay uniqueness on non-NULL values is fully preserved.
alter table public.pending_orders
  alter column razorpay_order_id drop not null;

-- ---------------------------------------------------------------------------
-- 3. Cashfree idempotency indexes
-- ---------------------------------------------------------------------------
-- Mirror the existing Razorpay partial-unique pattern so a Cashfree payment /
-- order id cannot be committed twice. Partial (WHERE ... is not null) so the
-- many rows that will legitimately carry NULL cf_* (all Razorpay rows) are
-- exempt from the uniqueness check.

-- orders.cf_payment_id — the Cashfree analogue of orders_razorpay_payment_id_udx.
create unique index if not exists orders_cf_payment_id_udx
  on public.orders (cf_payment_id)
  where cf_payment_id is not null;

-- pending_orders.cf_order_id — the Cashfree analogue of
-- pending_orders_razorpay_order_id_udx (the abandoned-cart / upsert key).
create unique index if not exists pending_orders_cf_order_id_udx
  on public.pending_orders (cf_order_id)
  where cf_order_id is not null;

-- Non-unique lookup index for orders.cf_order_id, matching
-- orders_razorpay_order_id_idx. Used for reconciliation / webhook recovery.
create index if not exists orders_cf_order_id_idx
  on public.orders (cf_order_id)
  where cf_order_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Provider integrity
-- ---------------------------------------------------------------------------
-- Guard against a typo silently mislabelling a payment provider, which would
-- corrupt reconciliation. Only the two providers that exist during the
-- migration are permitted; adding a third later is itself a migration.
alter table public.orders
  drop constraint if exists orders_payment_provider_check;
alter table public.orders
  add constraint orders_payment_provider_check
  check (payment_provider in ('razorpay', 'cashfree'));

alter table public.pending_orders
  drop constraint if exists pending_orders_payment_provider_check;
alter table public.pending_orders
  add constraint pending_orders_payment_provider_check
  check (payment_provider in ('razorpay', 'cashfree'));

-- ---------------------------------------------------------------------------
-- 5. Documentation
-- ---------------------------------------------------------------------------
comment on column public.orders.cf_order_id is
  'Cashfree order id (order_id sent to /pg/orders). NULL for Razorpay orders.';
comment on column public.orders.cf_payment_id is
  'Cashfree cf_payment_id of the successful transaction. NULL for Razorpay orders.';
comment on column public.orders.payment_provider is
  'Which gateway settled this order: razorpay (legacy/rollback) or cashfree (live).';
comment on column public.pending_orders.cf_order_id is
  'Cashfree order id for an in-flight checkout. NULL for Razorpay pending orders.';
comment on column public.pending_orders.payment_provider is
  'Gateway for this in-flight checkout: razorpay or cashfree.';
