-- =============================================================================
-- BATCH 1 · Migration 10 — inventory_reservation_status ENUM
-- =============================================================================
-- Creates the canonical ENUM type for inventory reservation lifecycle.
-- ENUM is used (not TEXT) because:
--   1. Postgres enforces valid values at the storage layer — no application
--      CHECK constraint can be accidentally bypassed.
--   2. Sorting and indexing are cheaper on ENUM than TEXT.
--   3. Future states (e.g. 'pending_confirmation') require a single
--      ALTER TYPE ... ADD VALUE — no data migration needed.
--
-- ⚠ Run this migration BEFORE 20260805000011 (inventory_reservations table).
-- ⚠ DO NOT drop this type while inventory_reservations exists.
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE public.inventory_reservation_status AS ENUM (
    'reserved',    -- held during active checkout window (default)
    'confirmed',   -- payment succeeded; stock permanently decremented
    'released',    -- customer abandoned / payment failed; stock restored
    'expired'      -- TTL elapsed before payment; stock restored by expire_inventory()
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists (e.g. re-running after a failed migration batch).
    -- Silently continue — idempotent.
    NULL;
END $$;

COMMIT;
