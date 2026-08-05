-- =============================================================================
-- BATCH 1 ROLLBACK — undo all Batch 1 migrations
-- =============================================================================
-- ⚠ RUN IN THIS ORDER — dependencies must be dropped before the types/tables
--   they reference.
-- ⚠ This rollback is DESTRUCTIVE — all inventory_reservations and
--   checkout_events data will be permanently deleted.
-- ⚠ The pricing_snapshot columns on pending_orders and orders will be dropped
--   along with any data stored in them.
-- =============================================================================

-- Step 1: Drop RPC functions (no dependencies on external tables)
DROP FUNCTION IF EXISTS public.expire_inventory();
DROP FUNCTION IF EXISTS public.confirm_inventory(TEXT, UUID);
DROP FUNCTION IF EXISTS public.release_inventory(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reserve_inventory(TEXT, JSONB, UUID, TEXT, INTEGER);

-- Step 2: Drop tables that depend on the ENUM type
DROP TABLE IF EXISTS public.inventory_reservations CASCADE;
DROP TABLE IF EXISTS public.checkout_events;

-- Step 3: Drop the ENUM type (must be after tables that use it)
DROP TYPE IF EXISTS public.inventory_reservation_status;

-- Step 4: Remove coupon extension columns
ALTER TABLE public.coupons DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS valid_until;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS valid_from;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS used_count;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS max_uses;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS min_order_value;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS discount_value;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS discount_type;

-- Step 5: Remove pricing_snapshot columns
ALTER TABLE public.pending_orders DROP COLUMN IF EXISTS pricing_snapshot;
ALTER TABLE public.orders         DROP COLUMN IF EXISTS pricing_snapshot;

-- ── Rollback complete ─────────────────────────────────────────────────────────
-- Database is restored to pre-Batch-1 state.
-- No existing data in orders, pending_orders, products, or coupons has been
-- touched except for the removal of the two new JSONB columns.
