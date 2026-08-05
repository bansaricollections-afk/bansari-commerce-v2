-- =============================================================================
-- BATCH 1 · Migration 14 — checkout_events (funnel analytics)
-- =============================================================================
-- PURPOSE
--   A single append-only event log for the entire checkout funnel.
--   Replaces the earlier coupon_failures design with a richer, unified table
--   that captures every meaningful checkout transition.
--
-- This table is intentionally WRITE-HEAVY and READ-RARELY.
-- All writes are fire-and-forget (best-effort) from service layer functions.
-- Reads are performed by analytics queries, dashboards, and data exports.
--
-- EXAMPLE event_type VALUES (convention, not enforced by DB):
--   checkout_started        — user opened checkout
--   coupon_applied          — coupon validated and applied
--   coupon_invalid          — coupon code not found
--   coupon_expired          — coupon found but past valid_until
--   coupon_inactive         — coupon found but is_active = FALSE
--   coupon_min_order        — subtotal below min_order_value
--   coupon_usage_limit      — max_uses reached
--   inventory_reserved      — reserve_inventory() succeeded
--   inventory_failed        — reserve_inventory() raised insufficient_stock
--   reservation_released    — release_inventory() called
--   reservation_expired     — expire_inventory() processed this order
--   payment_initiated       — Razorpay order created
--   payment_success         — payment.captured webhook received
--   payment_failed          — payment.failed webhook received
--   order_created           — final order row written to orders table
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.checkout_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Funnel event classification
  event_type    TEXT        NOT NULL,

  -- Session identity (both nullable for maximum flexibility)
  customer_id   UUID,           -- auth user UUID
  session_id    TEXT,           -- anonymous session token

  -- Coupon fields (populated for coupon_* events)
  coupon_code   TEXT,
  reason        TEXT,           -- human-readable failure reason

  -- Cart context
  cart_value    NUMERIC(12, 2), -- subtotal at time of event
  currency      TEXT NOT NULL DEFAULT 'INR',

  -- Flexible structured payload for any additional event-specific data
  -- Examples:
  --   coupon_invalid:     { "attempted_code": "SAVE50" }
  --   inventory_failed:   { "product_id": 42, "requested": 3, "available": 1 }
  --   payment_success:    { "razorpay_order_id": "order_xxx", "payment_id": "pay_xxx" }
  metadata      JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Analytics: events by type (e.g. count all coupon_invalid per day)
CREATE INDEX IF NOT EXISTS checkout_events_type_idx
  ON public.checkout_events (event_type, created_at DESC);

-- Analytics: funnel for a specific customer
CREATE INDEX IF NOT EXISTS checkout_events_customer_idx
  ON public.checkout_events (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

-- Analytics: coupon performance dashboard
CREATE INDEX IF NOT EXISTS checkout_events_coupon_idx
  ON public.checkout_events (coupon_code, event_type)
  WHERE coupon_code IS NOT NULL;

-- Time-series pruning support (pg_cron DELETE older than 90 days)
CREATE INDEX IF NOT EXISTS checkout_events_created_at_idx
  ON public.checkout_events (created_at);

-- ── Security ─────────────────────────────────────────────────────────────────
ALTER TABLE public.checkout_events DISABLE ROW LEVEL SECURITY;

COMMIT;
