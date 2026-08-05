-- =============================================================================
-- BATCH 1 · Migration 13 — Extend public.coupons
-- =============================================================================
-- REUSES the existing public.coupons table.
-- NEVER creates a second coupons table.
--
-- All ALTER TABLE statements use ADD COLUMN IF NOT EXISTS.
-- If the column already exists with a compatible type, the statement is a
-- no-op — zero breakage to existing coupons or checkout flows.
--
-- Columns added:
--   discount_type   — 'flat' (₹ amount) | 'percent' (% of subtotal)
--   discount_value  — the magnitude of the discount
--   min_order_value — minimum cart subtotal required to apply coupon
--   max_uses        — global usage cap (NULL = unlimited)
--   used_count      — current redemption count (incremented by markUsed())
--   valid_from      — coupon becomes active after this timestamp
--   valid_until     — coupon expires after this timestamp
--   is_active       — soft-disable without deleting the coupon row
-- =============================================================================

BEGIN;

-- Discount type must be either 'flat' (fixed ₹) or 'percent' (% of subtotal)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_type   TEXT
    CHECK (discount_type IN ('flat', 'percent'));

-- Magnitude of the discount (e.g. 50 = ₹50 flat | 15 = 15%)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_value  NUMERIC(10, 2);

-- Minimum cart subtotal before this coupon can be applied
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) DEFAULT 0;

-- Global usage cap across all customers (NULL = no limit)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses        INTEGER;

-- Running redemption count — incremented atomically in markUsed()
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS used_count      INTEGER NOT NULL DEFAULT 0;

-- Coupon activation window
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS valid_from      TIMESTAMPTZ;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS valid_until     TIMESTAMPTZ;

-- Soft-delete flag — false = coupon disabled without losing history
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Fast lookup by code (used by CouponService.validate())
-- Conditional: only creates the index if it does not already exist.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'coupons'
      AND indexname  = 'coupons_code_active_idx'
  ) THEN
    CREATE INDEX coupons_code_active_idx
      ON public.coupons (code)
      WHERE is_active = TRUE;
  END IF;
END $$;

COMMIT;
