-- =============================================================================
-- BATCH 1 · Migration 16 — Revision: pricing_snapshot mandatory-field enforcement
-- =============================================================================
--
-- IMMUTABILITY PRINCIPLE
-- ──────────────────────
-- Migrations 20260805000010 through 20260805000015 are committed production
-- history. They are NEVER edited. Every fix is additive. This migration
-- contains ONLY the delta identified by the CTO audit that is not already
-- present in 00010–00015.
--
-- WHAT 00015 ALREADY PROVIDES (do not duplicate)
-- ───────────────────────────────────────────────
-- • pricing_snapshot JSONB column on public.orders
-- • pricing_snapshot JSONB column on public.pending_orders
-- • orders_pricing_snapshot_math_check  — enforces the accounting identity:
--     grand_total = subtotal - discount + shipping + tax
-- • orders_pricing_snapshot_coupon_idx  — partial index on coupon_code
--
-- THE GAP THIS MIGRATION CLOSES
-- ──────────────────────────────
-- The math check alone is insufficient. Consider:
--
--   INSERT INTO orders (pricing_snapshot) VALUES ('{}');
--
-- This PASSES the math check because COALESCE treats missing JSON keys as 0:
--   0 (grand_total key absent → COALESCE null→0)
--   = COALESCE(null,0) - COALESCE(null,0) + COALESCE(null,0) + COALESCE(null,0)
--   = 0 - 0 + 0 + 0
--   = 0  ✓  (constraint satisfied)
--
-- A snapshot with no schema_version, no currency, no computed_by, no
-- computed_at is financially useless for audit purposes — yet it would be
-- silently stored. This migration adds a structural presence check that
-- requires the nine mandatory fields to exist as non-null JSON values
-- whenever the snapshot is non-null.
--
-- APPLIED TO BOTH TABLES
-- ──────────────────────
-- orders:        The permanent financial record. Most critical.
-- pending_orders: The transient pre-payment record. Fail-early principle:
--                 catch a malformed snapshot at pending_order INSERT rather
--                 than at order promotion time during payment confirmation.
--                 Cheaper to handle; avoids a payment-confirmed order that
--                 cannot be inserted into orders due to a structural failure.
--
-- IDEMPOTENCY
-- ───────────
-- All changes wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object
-- (SQLSTATE 42710). Safe to run:
--   (a) On a database where 00010–00015 are already applied   ✓
--   (b) On a fresh database running all migrations in sequence ✓
--   (c) If this migration itself is accidentally re-run        ✓
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. orders — mandatory structural fields check
-- =============================================================================
--
-- Constraint name: orders_pricing_snapshot_structure_check
--
-- This constraint is a COMPANION to orders_pricing_snapshot_math_check
-- (added by 00015). Together they enforce:
--   (a) Arithmetic correctness — math check (00015)
--   (b) Structural completeness — this check (00016)
--
-- MANDATORY FIELDS (must be non-null JSON values when snapshot is non-null):
--
--   schema_version    — INTEGER ≥ 1
--       Forward-compatibility version. Without it, future parsers cannot
--       branch on schema changes. A snapshot with no schema_version is
--       unparseable by any future tooling.
--
--   currency          — TEXT (e.g. 'INR')
--       Multi-currency readiness. A financial record with no currency code
--       is ambiguous and GDPR-hostile (cannot determine jurisdiction).
--
--   subtotal          — NUMERIC ≥ 0
--       Required by the math identity. Also required for line-item audits.
--
--   discount          — NUMERIC ≥ 0
--       Required by the math identity. Zero when no coupon — but must be
--       explicitly present, not absent.
--
--   shipping          — NUMERIC ≥ 0
--       Required by the math identity.
--
--   tax               — NUMERIC ≥ 0
--       Required by the math identity. Zero until GST — but must be
--       explicitly present to confirm tax was computed (not forgotten).
--
--   grand_total       — NUMERIC ≥ 0
--       The amount actually charged. The most critical field.
--       Without it the math check cannot operate, and the payment amount
--       cannot be independently verified.
--
--   computed_at       — TEXT (ISO 8601 timestamp)
--       Audit trail. Establishes when the price was frozen.
--       Required for pricing-rules disputes: "which rules were active
--       at the time of this order?"
--
--   computed_by       — TEXT (e.g. 'PricingService@1.0.0')
--       Audit trail. Identifies the service version that produced this
--       snapshot. Required for bug regression analysis.
--
-- IMPLEMENTATION NOTES
-- ────────────────────
-- We use (pricing_snapshot ? 'field_name') — the JSONB key-exists operator.
-- This returns TRUE if the key exists with ANY value including JSON null.
-- We additionally require the value to be non-null JSON by checking
-- (pricing_snapshot->>'field_name') IS NOT NULL — the ->> operator returns
-- SQL NULL when the JSON value is JSON null or the key is absent.
--
-- Combined: key must exist AND its value must not be JSON null.
-- This rejects both: {} (key absent) and {"grand_total": null} (null value).
--
-- NUMERIC range validation (≥ 0) is applied to financial fields to prevent
-- negative subtotals or negative tax from satisfying the math check through
-- sign manipulation.
--
-- schema_version INTEGER check: (pricing_snapshot->>'schema_version')::INTEGER >= 1
-- Rejects schema_version: 0 and schema_version: -1 defensively.
DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_pricing_snapshot_structure_check
    CHECK (
      -- When snapshot is absent, no constraint applies.
      -- When snapshot is present, all nine mandatory fields must exist
      -- as non-null values, and financial fields must be non-negative.
      pricing_snapshot IS NULL
      OR (
        -- ── Mandatory presence: structural fields ──────────────────────────
        (pricing_snapshot->>'schema_version')  IS NOT NULL
        AND (pricing_snapshot->>'schema_version')::INTEGER >= 1

        AND (pricing_snapshot->>'currency')     IS NOT NULL
        AND length(trim(pricing_snapshot->>'currency')) > 0

        AND (pricing_snapshot->>'computed_at')  IS NOT NULL
        AND length(trim(pricing_snapshot->>'computed_at')) > 0

        AND (pricing_snapshot->>'computed_by')  IS NOT NULL
        AND length(trim(pricing_snapshot->>'computed_by')) > 0

        -- ── Mandatory presence: financial fields (non-negative) ────────────
        AND (pricing_snapshot->>'subtotal')     IS NOT NULL
        AND (pricing_snapshot->>'subtotal')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'discount')     IS NOT NULL
        AND (pricing_snapshot->>'discount')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'shipping')     IS NOT NULL
        AND (pricing_snapshot->>'shipping')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'tax')          IS NOT NULL
        AND (pricing_snapshot->>'tax')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'grand_total')  IS NOT NULL
        AND (pricing_snapshot->>'grand_total')::NUMERIC(14,2) >= 0
      )
    );
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists (migration re-run or applied twice). Safe no-op.
    RAISE NOTICE 'orders_pricing_snapshot_structure_check already exists — skipping.';
END;
$$;


-- =============================================================================
-- 2. pending_orders — mandatory structural fields check
-- =============================================================================
--
-- Constraint name: pending_orders_pricing_snapshot_structure_check
--
-- RATIONALE FOR APPLYING TO pending_orders
-- ─────────────────────────────────────────
-- pending_orders is a transient record created during checkout, before
-- payment is confirmed. The pricing_snapshot stored here is later COPIED
-- to orders when payment succeeds.
--
-- If CheckoutService stores a structurally invalid snapshot in pending_orders
-- and this migration did NOT guard it, the flow would be:
--
--   (1) CheckoutService creates pending_order with {}  → PASSES (no guard)
--   (2) Razorpay payment succeeds
--   (3) WebhookDispatcher calls OrderService.createFromPending()
--   (4) OrderService copies pricing_snapshot {} to orders row
--   (5) INSERT into orders FAILS (structure check on orders)
--   (6) Payment is confirmed in Razorpay but order does not exist.
--       → CRITICAL: money collected, no order record. Revenue leak.
--
-- By applying the same structural guard to pending_orders at step (1),
-- CheckoutService is forced to fix the snapshot BEFORE collecting payment.
-- This is the correct fail-early point.
--
-- SAME LOGIC AS orders CHECK ABOVE — see comments there.
DO $$
BEGIN
  ALTER TABLE public.pending_orders
    ADD CONSTRAINT pending_orders_pricing_snapshot_structure_check
    CHECK (
      pricing_snapshot IS NULL
      OR (
        (pricing_snapshot->>'schema_version')  IS NOT NULL
        AND (pricing_snapshot->>'schema_version')::INTEGER >= 1

        AND (pricing_snapshot->>'currency')     IS NOT NULL
        AND length(trim(pricing_snapshot->>'currency')) > 0

        AND (pricing_snapshot->>'computed_at')  IS NOT NULL
        AND length(trim(pricing_snapshot->>'computed_at')) > 0

        AND (pricing_snapshot->>'computed_by')  IS NOT NULL
        AND length(trim(pricing_snapshot->>'computed_by')) > 0

        AND (pricing_snapshot->>'subtotal')     IS NOT NULL
        AND (pricing_snapshot->>'subtotal')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'discount')     IS NOT NULL
        AND (pricing_snapshot->>'discount')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'shipping')     IS NOT NULL
        AND (pricing_snapshot->>'shipping')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'tax')          IS NOT NULL
        AND (pricing_snapshot->>'tax')::NUMERIC(14,2) >= 0

        AND (pricing_snapshot->>'grand_total')  IS NOT NULL
        AND (pricing_snapshot->>'grand_total')::NUMERIC(14,2) >= 0
      )
    );
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'pending_orders_pricing_snapshot_structure_check already exists — skipping.';
END;
$$;


COMMIT;

-- =============================================================================
-- POST-MIGRATION STATE SUMMARY
-- =============================================================================
-- After 00016, public.orders has TWO pricing_snapshot constraints:
--
--   orders_pricing_snapshot_math_check  (added by 00015)
--   ── Enforces: grand_total = subtotal - discount + shipping + tax
--
--   orders_pricing_snapshot_structure_check  (added by 00016)
--   ── Enforces: schema_version, currency, computed_at, computed_by,
--               subtotal, discount, shipping, tax, grand_total
--               are all present and non-null when snapshot is non-null.
--               Financial fields must be >= 0.
--
-- Together: a snapshot must be (a) arithmetically correct AND (b) structurally
-- complete. An empty {}, a partially-populated snapshot, or a snapshot with
-- null values for required fields now fails at INSERT time.
--
-- public.pending_orders has ONE pricing_snapshot constraint:
--
--   pending_orders_pricing_snapshot_structure_check  (added by 00016)
--   ── Same structural rule as orders. Fail-early before payment collection.
--
-- public.pending_orders does NOT have the math check by deliberate design
-- (documented in 00015): transient records may be created before tax is
-- finalised. The structural check is sufficient at this stage.
-- =============================================================================
