-- =============================================================================
-- BATCH 1 ROLLBACK (REVISED) — undo all Batch 1 migrations
-- =============================================================================
-- REVISION CHANGELOG (2026-08-05)
--   P1: Wrapped in BEGIN/COMMIT — rollback is now fully atomic.
--       If any step fails, the entire rollback is rolled back, leaving
--       the database in a consistent state rather than a partial one.
--   P1: Added DROP INDEX for coupons_code_active_idx and coupons_code_unique_idx
--       BEFORE dropping the is_active and code columns they depend on.
--       Without this, ALTER TABLE ... DROP COLUMN IF EXISTS is_active
--       would fail because the partial index WHERE is_active = TRUE
--       still references the column.
--   P1: Added DROP TRIGGER and DROP FUNCTION for lifecycle timestamp trigger.
--
-- ⚠ This rollback is DESTRUCTIVE:
--   - All inventory_reservations data is permanently deleted.
--   - All checkout_events data is permanently deleted.
--   - pricing_snapshot JSONB columns on pending_orders and orders are dropped.
--   - coupon extension columns are removed (used_count data lost).
--
-- ⚠ Run ORDER matters — dependencies must be dropped before their parents.
-- =============================================================================

BEGIN;

-- Step 1: Drop lifecycle timestamp trigger and function
-- Must be dropped before the table it references (inventory_reservations).
DROP TRIGGER IF EXISTS trg_inv_res_lifecycle_timestamps
  ON public.inventory_reservations;
DROP FUNCTION IF EXISTS public.fn_inv_res_lifecycle_timestamps();

-- Step 2: Drop RPC functions (no remaining dependencies)
DROP FUNCTION IF EXISTS public.expire_inventory(INTEGER);
DROP FUNCTION IF EXISTS public.confirm_inventory(TEXT, UUID);
DROP FUNCTION IF EXISTS public.release_inventory(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reserve_inventory(TEXT, JSONB, UUID, TEXT, INTEGER);

-- Step 3: Drop tables that depend on the ENUM type
-- CASCADE drops all indexes, triggers, and FK references on these tables.
DROP TABLE IF EXISTS public.inventory_reservations CASCADE;
DROP TABLE IF EXISTS public.checkout_events;

-- Step 4: Drop ENUM type (must be AFTER tables that reference it)
DROP TYPE IF EXISTS public.inventory_reservation_status;

-- Step 5: Remove coupon indexes BEFORE removing the columns they depend on.
-- ⚠ Critical order: index referencing is_active must be dropped before
--   DROP COLUMN IF EXISTS is_active. Postgres would otherwise error.
DROP INDEX IF EXISTS public.coupons_code_active_idx;   -- WHERE is_active = TRUE
DROP INDEX IF EXISTS public.coupons_code_unique_idx;   -- ON (code)

-- Step 6: Remove coupon extension columns
-- Safe to drop in any order now that dependent indexes are gone.
ALTER TABLE public.coupons DROP COLUMN IF EXISTS last_used_at;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS valid_until;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS valid_from;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS used_count;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS max_uses;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS min_order_value;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS discount_value;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS discount_type;

-- Step 7: Remove pricing_snapshot CHECK constraint before dropping the column
-- (DROP COLUMN CASCADE would also remove it, but being explicit is safer)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_pricing_snapshot_math_check;

-- Step 8: Remove pricing_snapshot columns
ALTER TABLE public.pending_orders DROP COLUMN IF EXISTS pricing_snapshot;
ALTER TABLE public.orders         DROP COLUMN IF EXISTS pricing_snapshot;

-- ── Rollback complete ──────────────────────────────────────────────────────────
-- Database is restored to pre-Batch-1 state.
-- All changes above are wrapped in this transaction. If any step fails,
-- the entire rollback is automatically rolled back by Postgres.

COMMIT;
