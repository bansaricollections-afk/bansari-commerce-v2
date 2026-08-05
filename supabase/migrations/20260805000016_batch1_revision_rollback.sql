-- =============================================================================
-- BATCH 1 · Migration 16 ROLLBACK — undo ONLY what 00016 introduced
-- =============================================================================
--
-- SCOPE
-- ─────
-- This rollback undoes ONLY the two CHECK constraints added by
-- 20260805000016_batch1_revision.sql.
--
-- It does NOT touch anything from migrations 00010–00015:
--   ✗  Does not drop inventory_reservations
--   ✗  Does not drop checkout_events
--   ✗  Does not remove coupon columns
--   ✗  Does not remove pricing_snapshot columns
--   ✗  Does not drop orders_pricing_snapshot_math_check (from 00015)
--   ✗  Does not drop RPC functions
--   ✗  Does not drop indexes
--   ✗  Does not drop the inventory_reservation_status ENUM
--
-- WHEN TO RUN
-- ───────────
-- Only if 00016 needs to be rolled back independently — e.g. a constraint
-- is found to be too strict for an in-progress schema migration in the
-- PricingService rollout. Migrations 00010–00015 remain fully intact.
--
-- ATOMIC
-- ──────
-- Wrapped in BEGIN/COMMIT. If either DROP fails, neither change is applied.
-- Idempotent: IF EXISTS guards prevent errors on a DB where 00016 was
-- already rolled back.
-- =============================================================================

BEGIN;

-- ── 1. Remove structure check from orders ────────────────────────────────────
-- Added by 00016. Does not affect orders_pricing_snapshot_math_check (00015).
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_pricing_snapshot_structure_check;

-- ── 2. Remove structure check from pending_orders ────────────────────────────
-- Added by 00016. pending_orders had no constraints from 00015.
ALTER TABLE public.pending_orders
  DROP CONSTRAINT IF EXISTS pending_orders_pricing_snapshot_structure_check;

COMMIT;

-- =============================================================================
-- POST-ROLLBACK STATE
-- =============================================================================
-- public.orders retains: orders_pricing_snapshot_math_check (from 00015)
-- public.orders drops:   orders_pricing_snapshot_structure_check (from 00016)
--
-- public.pending_orders retains: pricing_snapshot JSONB column (from 00015)
-- public.pending_orders drops:   pending_orders_pricing_snapshot_structure_check
--
-- Database is in the same state as after 00015 was applied.
-- All inventory, coupon, and checkout_events infrastructure is unaffected.
-- =============================================================================
