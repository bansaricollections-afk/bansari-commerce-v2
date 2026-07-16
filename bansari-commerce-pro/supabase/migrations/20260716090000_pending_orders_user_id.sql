-- =============================================================================
-- Migration: 20260716090000_pending_orders_user_id.sql
-- Purpose  : Add user_id to pending_orders so that webhook recovery can
--            correctly assign order ownership to authenticated users.
--
--            Without this column, every recovered order is created as a
--            guest order (user_id = NULL) even when the payment originated
--            from an authenticated session, breaking order history.
-- =============================================================================

ALTER TABLE pending_orders
  ADD COLUMN IF NOT EXISTS user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN pending_orders.user_id IS
  'Authenticated user who initiated checkout. NULL for guest checkouts. '
  'Written by create-order API route using server-validated JWT. '
  'Read by webhook recovery to correctly assign order ownership.';

-- Index for user-scoped pending order lookups (e.g. order history reconciliation).
CREATE INDEX IF NOT EXISTS pending_orders_user_id_idx
  ON pending_orders (user_id)
  WHERE user_id IS NOT NULL;
