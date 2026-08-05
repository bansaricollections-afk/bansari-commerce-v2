-- =============================================================================
-- BATCH 1 · Migration 13 (REVISED) — Extend public.coupons
-- =============================================================================
-- REVISION CHANGELOG (2026-08-05)
--   P1: Added UNIQUE index on coupons.code.
--       Duplicate coupon codes are unacceptable because:
--       (a) CouponService.validate() would receive multiple rows for the same
--           code and either throw or silently apply the wrong coupon.
--       (b) Two coupons with the same code but different discount_values
--           creates ambiguity that cannot be resolved deterministically.
--       (c) Promotional campaigns that expect a code to have a specific
--           discount would silently apply a different discount.
--   P2: Added last_used_at TIMESTAMPTZ for abuse detection and analytics.
-- =============================================================================

BEGIN;

-- Discount type: 'flat' (fixed ₹ off) or 'percent' (% of subtotal)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_type   TEXT
    CHECK (discount_type IN ('flat', 'percent'));

-- Magnitude of the discount (e.g., 50 for ₹50 flat or 15 for 15%)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_value  NUMERIC(10, 2);

-- Minimum cart subtotal required to apply this coupon
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) DEFAULT 0;

-- Global usage cap across all customers (NULL = unlimited)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses        INTEGER;

-- Running redemption count — incremented atomically by CouponService.markUsed()
-- via a SELECT ... FOR UPDATE to prevent concurrent over-redemption
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS used_count      INTEGER NOT NULL DEFAULT 0;

-- Coupon activation window
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS valid_from      TIMESTAMPTZ;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS valid_until     TIMESTAMPTZ;

-- Soft-disable flag
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE;

-- P2: Timestamp of last successful redemption
-- Used for: abuse detection (same code used every 2 minutes by different
-- accounts suggests a public leak), customer support, analytics.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS last_used_at    TIMESTAMPTZ;

-- =============================================================================
-- P1: UNIQUE constraint on coupon code
-- =============================================================================
-- Duplicate codes are a data integrity violation. Two rows with the same
-- code but different discount_values are irreconcilable — any validate()
-- call will return an arbitrary result depending on query plan row order.
-- This unique index makes such a state impossible at the storage level.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'coupons' AND indexname = 'coupons_code_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX coupons_code_unique_idx
      ON public.coupons (code);
  END IF;
END $$;

-- Fast lookup by code for active coupons (used by CouponService.validate())
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'coupons' AND indexname = 'coupons_code_active_idx'
  ) THEN
    CREATE INDEX coupons_code_active_idx
      ON public.coupons (code)
      WHERE is_active = TRUE;
  END IF;
END $$;

COMMIT;
