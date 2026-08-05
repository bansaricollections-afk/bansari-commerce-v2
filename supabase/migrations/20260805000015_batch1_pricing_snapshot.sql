-- =============================================================================
-- BATCH 1 · Migration 15 — pricing_snapshot on pending_orders and orders
-- =============================================================================
-- PURPOSE
--   Store a frozen JSON snapshot of the pricing computation at checkout time.
--   Orders must COPY this snapshot — never recalculate totals from live data.
--
-- SNAPSHOT SCHEMA (stored in pricing_snapshot JSONB column):
--   {
--     "pricing_version": 1,           -- schema version for forward compatibility
--     "subtotal":       3999.00,
--     "shipping":       0.00,
--     "discount":       600.00,
--     "tax":            0.00,
--     "grand_total":    3399.00,
--     "coupon_code":    "DIWALI15",   -- null if no coupon
--     "discount_type":  "percent",   -- null if no coupon
--     "discount_value": 15,           -- null if no coupon
--     "free_shipping":  true,         -- flag for UI display
--     "computed_at":    "2026-08-05T05:31:00.000Z"
--   }
--
-- WHY JSONB?
--   Pricing rules change (new shipping tiers, GST, loyalty points).
--   A frozen snapshot ensures historical orders are always correct regardless
--   of future rule changes. No recalculation is ever needed.
--
-- EXISTING COLUMNS ARE PRESERVED.
--   The individual subtotal / shipping_fee / discount / grand_total columns
--   remain unchanged for backward compatibility with existing queries.
--   pricing_snapshot is ADDITIVE — it provides the authoritative frozen record
--   while existing columns continue to serve existing API consumers.
-- =============================================================================

BEGIN;

-- ── pending_orders ────────────────────────────────────────────────────────────
ALTER TABLE public.pending_orders
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- ── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- Partial index: fast lookup of orders where a coupon was applied
-- (analytics: coupon redemption rate, revenue impact)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders'
      AND indexname  = 'orders_pricing_snapshot_coupon_idx'
  ) THEN
    CREATE INDEX orders_pricing_snapshot_coupon_idx
      ON public.orders ((pricing_snapshot->>'coupon_code'))
      WHERE pricing_snapshot IS NOT NULL
        AND pricing_snapshot->>'coupon_code' IS NOT NULL;
  END IF;
END $$;

COMMIT;
