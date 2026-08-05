-- =============================================================================
-- BATCH 1 · Migration 11 (REVISED) — inventory_reservations table
-- =============================================================================
-- REVISION CHANGELOG (2026-08-05)
--   P0: Table now carries confirmed_at/released_at/expired_at/updated_at.
--       Trigger fn_inv_res_lifecycle_timestamps auto-populates them on
--       every status transition.
--   P1: Added partial index (product_id) WHERE status='reserved'.
--   P1: Added variant_id for SKU-level reservation accuracy.
--   P2: Added reservation_source for future warehouse/admin holds.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Order linkage (nullable — not known until payment confirmed) ──────────
  order_id              UUID        REFERENCES public.orders(id) ON DELETE SET NULL,

  -- ── Session identity ──────────────────────────────────────────────────────
  customer_id           UUID,
  session_id            TEXT,

  -- ── Razorpay linkage (primary lifecycle join key) ─────────────────────────
  razorpay_order_id     TEXT        NOT NULL,

  -- ── Product / SKU ─────────────────────────────────────────────────────────
  product_id            INTEGER     NOT NULL REFERENCES public.products(id),
  -- variant_id: NULL = no variants; populated when product has size/colour SKUs
  variant_id            INTEGER,
  quantity              INTEGER     NOT NULL CHECK (quantity > 0),

  -- ── Status lifecycle ──────────────────────────────────────────────────────
  status                public.inventory_reservation_status NOT NULL DEFAULT 'reserved',

  -- Human-readable reason for terminal states (released / expired)
  expires_reason        TEXT,
    -- Convention (not DB-enforced):
    --   'payment_failed'      — payment.failed webhook
    --   'ttl_elapsed'         — expire_inventory() batch
    --   'customer_abandoned'  — explicit checkout cancellation
    --   'order_cancelled'     — downstream order cancellation

  -- Source of this reservation (future extensibility: admin holds, warehouse)
  reservation_source    TEXT        NOT NULL DEFAULT 'checkout',
    -- Convention: 'checkout' | 'admin_hold' | 'webhook_recovery'

  -- ── State-transition timestamps ───────────────────────────────────────────
  -- All set automatically by trigger fn_inv_res_lifecycle_timestamps.
  -- Never set manually by application code.
  reserved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  confirmed_at          TIMESTAMPTZ,   -- populated when status → 'confirmed'
  released_at           TIMESTAMPTZ,   -- populated when status → 'released'
  expired_at            TIMESTAMPTZ,   -- populated when status → 'expired'
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- updated by trigger on every UPDATE
);

-- =============================================================================
-- TRIGGER: auto-populate state-transition timestamps
-- =============================================================================
-- Fires BEFORE UPDATE on every row. Sets the appropriate timestamp column
-- when status changes to a terminal state. Also maintains updated_at.
--
-- WHY A TRIGGER AND NOT APPLICATION CODE:
--   Application code can forget. The RPC function can be called directly.
--   A trigger is the only reliable guarantee that these timestamps are ALWAYS
--   set — regardless of call site.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_inv_res_lifecycle_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Always update updated_at
  NEW.updated_at := NOW();

  -- Set transition timestamp when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        NEW.confirmed_at := NOW();
      WHEN 'released' THEN
        NEW.released_at  := NOW();
      WHEN 'expired' THEN
        NEW.expired_at   := NOW();
      ELSE
        NULL; -- 'reserved' → 'reserved' (no-op, updated_at still refreshed)
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inv_res_lifecycle_timestamps
  ON public.inventory_reservations;

CREATE TRIGGER trg_inv_res_lifecycle_timestamps
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_inv_res_lifecycle_timestamps();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lifecycle join key (used by all 4 RPC functions)
CREATE INDEX IF NOT EXISTS inv_res_razorpay_order_id_idx
  ON public.inventory_reservations (razorpay_order_id);

-- Deduplication: prevents two active reservations for the same product
-- in the same Razorpay order. Also the ON CONFLICT target in reserve_inventory().
CREATE UNIQUE INDEX IF NOT EXISTS inv_res_active_reservation_unique_idx
  ON public.inventory_reservations (razorpay_order_id, product_id)
  WHERE status = 'reserved';

-- P1 FIX: Accelerates the available-stock calculation in reserve_inventory().
--
-- Query served:
--   SELECT COALESCE(SUM(quantity), 0)
--   FROM inventory_reservations
--   WHERE product_id = $1 AND status = 'reserved'
--
-- Without this index the query does a full table scan on every cart item in
-- every concurrent checkout. With it, Postgres uses an index scan on only
-- the active reservation subset — typically <1% of the table at any time.
CREATE INDEX IF NOT EXISTS inv_res_product_reserved_idx
  ON public.inventory_reservations (product_id)
  WHERE status = 'reserved';

-- TTL expiry scan for expire_inventory() batch job
CREATE INDEX IF NOT EXISTS inv_res_expires_at_idx
  ON public.inventory_reservations (expires_at)
  WHERE status = 'reserved';

-- Post-confirmation lookup by order_id
CREATE INDEX IF NOT EXISTS inv_res_order_id_idx
  ON public.inventory_reservations (order_id)
  WHERE order_id IS NOT NULL;

-- ── Security ─────────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_reservations DISABLE ROW LEVEL SECURITY;

COMMIT;
