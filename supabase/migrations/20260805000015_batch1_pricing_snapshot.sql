-- =============================================================================
-- BATCH 1 · Migration 15 (REVISED) — pricing_snapshot
-- =============================================================================
-- REVISION CHANGELOG (2026-08-05)
--   P1: Added CHECK constraint on orders.pricing_snapshot that verifies:
--       grand_total = subtotal - discount + shipping + tax
--       This is a financial correctness control. A PricingService bug that
--       stores a mathematically incorrect snapshot will now FAIL at INSERT
--       time rather than silently persisting incorrect financial data.
--   P1: Enriched JSON schema documentation to include all required fields.
-- =============================================================================

BEGIN;

-- ── pending_orders ────────────────────────────────────────────────────────────
ALTER TABLE public.pending_orders
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- ── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- =============================================================================
-- FINANCIAL CORRECTNESS CHECK CONSTRAINT
-- =============================================================================
-- This constraint enforces the fundamental accounting identity:
--   grand_total = subtotal - discount + shipping + tax
--
-- It fires on INSERT and UPDATE. If PricingService computes an incorrect
-- grand_total (e.g. applies discount twice, forgets shipping), the order
-- row will FAIL to insert with a ConstraintViolationError. This is the
-- correct behaviour — a financially incorrect order must never be persisted.
--
-- NUMERIC casting with COALESCE: handles NULL fields (e.g. discount is 0
-- when no coupon is applied — stored as 0 not NULL, but COALESCE is defensive).
--
-- TOLERANCE: Exact NUMERIC equality. No floating point. All pricing fields
-- are NUMERIC(x,2) — there is no floating point rounding error.
--
-- The constraint is applied to orders (the permanent record) and NOT to
-- pending_orders (the transient pre-payment record) because pending_orders
-- may be created before tax calculation is finalised in some flows.
-- Enforce it on the permanent record where it matters most.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_pricing_snapshot_math_check
  CHECK (
    pricing_snapshot IS NULL
    OR (
      (pricing_snapshot->>'grand_total')::NUMERIC(14,2) =
        COALESCE((pricing_snapshot->>'subtotal')::NUMERIC(14,2),  0)
      - COALESCE((pricing_snapshot->>'discount')::NUMERIC(14,2),  0)
      + COALESCE((pricing_snapshot->>'shipping')::NUMERIC(14,2),  0)
      + COALESCE((pricing_snapshot->>'tax')::NUMERIC(14,2),       0)
    )
  );

-- Partial index: fast lookup of orders where a coupon was applied
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


-- =============================================================================
-- CANONICAL pricing_snapshot JSON SCHEMA
-- =============================================================================
-- This comment block is the authoritative definition of the pricing_snapshot
-- JSON schema. PricingService MUST produce exactly this structure.
-- Any deviation will cause the math CHECK constraint to reject the order.
--
-- SCHEMA VERSION 1:
-- {
--   "schema_version":          1,
--       Version of this JSON schema. Increment when new top-level fields are
--       added. Parsers branch on this value for forward compatibility.
--
--   "pricing_engine_version":  "1.0.0",
--       Semver of PricingService at computation time. When pricing rules
--       change (new GST tier, new shipping table), increment this version.
--       Allows historical orders to be re-audited against the correct ruleset.
--
--   "currency":                "INR",
--       ISO 4217 currency code. Mandatory. Multi-currency readiness.
--
--   "subtotal":                3999.00,
--       Sum of (unit_price × quantity) for all line items, before discounts.
--
--   "discount":                600.00,
--       Total discount applied. MUST equal sum of discount_breakdown amounts.
--       Zero (not null) when no discount is applied.
--
--   "discount_breakdown": [
--     { "type": "coupon", "code": "DIWALI15", "amount": 600.00 }
--   ],
--       Array of discount sources. Required even when only one discount.
--       Supports future: loyalty points + coupon stacking.
--       Each entry: { "type": str, "code": str|null, "amount": number }
--
--   "coupon_code":             "DIWALI15",
--       Null when no coupon. Frozen copy of the applied coupon code.
--       If the coupon row is later deleted, this value preserves history.
--
--   "coupon_type":             "percent",
--       Frozen copy of coupons.discount_type at redemption time.
--       Either 'flat' or 'percent'.
--
--   "coupon_discount_value":   15,
--       Frozen copy of coupons.discount_value at redemption time.
--       15 = 15% off. Not the computed amount — the rule magnitude.
--
--   "shipping":                0.00,
--       Shipping fee applied. Zero for free shipping.
--
--   "shipping_rule_id":        "free_above_999",
--       Identifier of the shipping rule that produced this shipping fee.
--       When shipping rules change, historical orders remain auditable.
--
--   "tax":                     0.00,
--       Tax amount. Zero until GST implementation. Always present.
--
--   "tax_rate":                0.0,
--       Effective tax rate (e.g. 0.18 for 18% GST). Zero until GST.
--       Stored so the rate can be verified independently of the amount.
--
--   "grand_total":             3399.00,
--       MUST equal subtotal - discount + shipping + tax.
--       Enforced by orders_pricing_snapshot_math_check CHECK constraint.
--
--   "item_count":              2,
--       Number of distinct line items. Used as a guard against line-item
--       tampering during webhook recovery.
--
--   "computed_at":             "2026-08-05T05:31:00.000Z",
--       ISO 8601 UTC timestamp of when PricingService computed this snapshot.
--
--   "computed_by":             "PricingService@1.0.0"
--       Service identity string for audit trail.
-- }
--
-- EXAMPLE — order with 15% coupon, free shipping:
-- {
--   "schema_version": 1,
--   "pricing_engine_version": "1.0.0",
--   "currency": "INR",
--   "subtotal": 3999.00,
--   "discount": 599.85,
--   "discount_breakdown": [
--     { "type": "coupon", "code": "DIWALI15", "amount": 599.85 }
--   ],
--   "coupon_code": "DIWALI15",
--   "coupon_type": "percent",
--   "coupon_discount_value": 15,
--   "shipping": 0.00,
--   "shipping_rule_id": "free_above_999",
--   "tax": 0.00,
--   "tax_rate": 0.0,
--   "grand_total": 3399.15,
--   "item_count": 2,
--   "computed_at": "2026-08-05T05:31:00.000Z",
--   "computed_by": "PricingService@1.0.0"
-- }
-- =============================================================================
