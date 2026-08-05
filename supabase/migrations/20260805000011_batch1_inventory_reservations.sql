-- =============================================================================
-- BATCH 1 · Migration 11 — inventory_reservations table
-- =============================================================================
-- PURPOSE
--   Soft-hold inventory for the duration of a Razorpay checkout session.
--   Prevents overselling when two customers checkout the last unit concurrently.
--
-- LIFECYCLE
--   1. reserve_inventory() RPC  → status = 'reserved'
--      Called from CheckoutService BEFORE creating the Razorpay order.
--      TTL: 15 minutes (configurable via expires_at).
--
--   2. confirm_inventory() RPC  → status = 'confirmed'
--      Called from InventoryService.confirm() AFTER payment.captured webhook
--      or /api/orders/create. Does NOT decrement stock — that is done by
--      InventoryService.adjustStock() as a separate responsibility.
--
--   3. release_inventory() RPC  → status = 'released'
--      Called from InventoryService.release() on payment.failed or
--      customer abandonment.
--
--   4. expire_inventory() RPC   → status = 'expired'
--      Batch job (pg_cron or Supabase Edge Function) sets TTL-elapsed rows.
--      Returns count of expired rows for monitoring.
--
-- OVERSELL PREVENTION
--   reserve_inventory() uses SELECT ... FOR UPDATE on the products row to
--   serialise concurrent checkouts. Available stock is computed as:
--     products.stock  -  SUM(quantity WHERE status = 'reserved')
--   If the result < requested quantity, the RPC raises 'insufficient_stock'.
--
-- IDEMPOTENCY
--   The partial unique index on (razorpay_order_id, product_id) WHERE status
--   = 'reserved' ensures only one active reservation per product per checkout.
--   Duplicate reserve calls for the same order silently succeed (ON CONFLICT
--   DO NOTHING) and the existing reservation is returned.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Order linkage (populated AFTER payment confirmed) ─────────────────────
  -- Nullable: not yet known at reservation time. Set by confirm_inventory().
  order_id              UUID        REFERENCES public.orders(id) ON DELETE SET NULL,

  -- ── Session identity ──────────────────────────────────────────────────────
  -- customer_id: auth user UUID (null for guests)
  customer_id           UUID,
  -- session_id: anonymous session token for guest tracking
  session_id            TEXT,

  -- ── Razorpay linkage ──────────────────────────────────────────────────────
  -- Populated immediately at reservation time. Used as the join key throughout
  -- the reservation lifecycle because order_id is not yet known.
  razorpay_order_id     TEXT        NOT NULL,

  -- ── Product ───────────────────────────────────────────────────────────────
  product_id            INTEGER     NOT NULL REFERENCES public.products(id),
  quantity              INTEGER     NOT NULL CHECK (quantity > 0),

  -- ── Status lifecycle ──────────────────────────────────────────────────────
  status                public.inventory_reservation_status NOT NULL
                          DEFAULT 'reserved',

  -- Populated when status transitions to 'released' or 'expired'.
  -- Allows analytics queries like: why did reservations not convert?
  expires_reason        TEXT,
    -- Possible values (convention, not enforced by DB):
    --   'payment_failed'     — Razorpay payment.failed event received
    --   'ttl_elapsed'        — expire_inventory() batch ran
    --   'customer_abandoned' — explicit cancellation from checkout UI
    --   'order_cancelled'    — downstream order cancellation

  -- ── Timestamps ────────────────────────────────────────────────────────────
  reserved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Fast lookup by Razorpay order id (primary join key in all RPC functions)
CREATE INDEX IF NOT EXISTS inv_res_razorpay_order_id_idx
  ON public.inventory_reservations (razorpay_order_id);

-- Partial unique index — prevents duplicate active reservations for the
-- same product in the same Razorpay order. ON CONFLICT DO NOTHING in
-- reserve_inventory() uses this index for idempotent re-calls.
CREATE UNIQUE INDEX IF NOT EXISTS inv_res_active_reservation_unique_idx
  ON public.inventory_reservations (razorpay_order_id, product_id)
  WHERE status = 'reserved';

-- TTL expiry scan — expire_inventory() queries this index to find candidates
CREATE INDEX IF NOT EXISTS inv_res_expires_at_idx
  ON public.inventory_reservations (expires_at)
  WHERE status = 'reserved';

-- Analytics: look up all reservations for an order after confirmation
CREATE INDEX IF NOT EXISTS inv_res_order_id_idx
  ON public.inventory_reservations (order_id)
  WHERE order_id IS NOT NULL;

-- ── Security ─────────────────────────────────────────────────────────────────
-- RLS disabled — accessed exclusively via service-role client from server-side
-- API routes and Postgres RPCs. Never exposed to Supabase PostgREST auto-API.
ALTER TABLE public.inventory_reservations DISABLE ROW LEVEL SECURITY;

COMMIT;
