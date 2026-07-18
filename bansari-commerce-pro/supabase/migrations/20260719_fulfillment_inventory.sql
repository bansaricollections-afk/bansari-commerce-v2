-- ===========================================================
-- FULFILLMENT & INVENTORY INTEGRATION — Migration
-- ===========================================================
--
-- SCHEMA FACTS (verified from prior migrations):
--
--   product_variants.id  → bigint  (NOT uuid)
--   products.id          → bigint  (NOT uuid)
--   orders.id            → uuid    ✓
--   product_variants.stock          → integer NOT NULL (exists)
--   product_variants.reserved_stock → integer NOT NULL (already added by
--                                     20260718100000_product_management_v2_foundation.sql)
--   product_variants.updated_at     → timestamptz (exists, trigger-maintained)
--   order_items has NO variant_id column — inventory_transactions.order_id
--                                          links to orders.id (uuid) instead.
--
-- Run order:
--   1. Guard reserved_stock column (already exists in V2 — skip is safe)
--   2. Add cross-table constraint reserved_stock <= stock (new; V2 only has
--      individual CHECK constraints, not the combined one)
--   3. Create inventory_transactions table (bigint variant_id FK)
--   4. Create indexes
--   5. RPC: increment_variant_reserved_stock  (bigint param)
--   6. RPC: decrement_variant_reserved_stock  (bigint param)
--   7. RPC: convert_reservation_to_sale       (bigint param)
--   8. RPC: restore_variant_stock             (bigint param)
--   9. RPC: get_fulfillment_metrics
-- ===========================================================


-- -----------------------------------------------------------
-- 1. Guard: reserved_stock column
-- -----------------------------------------------------------
-- product_variants.reserved_stock is ALREADY defined in
-- 20260718100000_product_management_v2_foundation.sql.
-- This block is a safety net for environments where that
-- migration has not yet been applied (fresh DB, reset, etc.).
-- It is a no-op if the column already exists.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_variants'
      AND column_name  = 'reserved_stock'
  ) THEN
    ALTER TABLE public.product_variants
      ADD COLUMN reserved_stock integer NOT NULL DEFAULT 0
        CHECK (reserved_stock >= 0);
  END IF;
END $$;

-- -----------------------------------------------------------
-- 2. Cross-column constraint: reserved_stock <= stock
-- -----------------------------------------------------------
-- The V2 migration adds CHECK (stock >= 0) and
-- CHECK (reserved_stock >= 0) separately on each column.
-- It does NOT add the combined reserved_stock <= stock guard.
-- We add it here, idempotently.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema     = 'public'
      AND table_name       = 'product_variants'
      AND constraint_name  = 'chk_variant_reserved_lte_stock'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT chk_variant_reserved_lte_stock
        CHECK (reserved_stock <= stock);
  END IF;
END $$;

-- -----------------------------------------------------------
-- 3. inventory_transactions table
-- -----------------------------------------------------------
-- CRITICAL FIX: variant_id is bigint (matches product_variants.id).
-- order_id   is uuid    (matches orders.id).
-- Previous version incorrectly declared variant_id as uuid.
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id        bigint      NOT NULL
                                  REFERENCES public.product_variants(id)
                                  ON DELETE RESTRICT,
  order_id          uuid        REFERENCES public.orders(id)
                                  ON DELETE SET NULL,
  movement_type     text        NOT NULL
                                  CHECK (movement_type IN (
                                    'reservation', 'release', 'sale',
                                    'return',      'refund',
                                    'manual_adjustment', 'damage', 'lost', 'capture'
                                  )),
  quantity          integer     NOT NULL,
  previous_stock    integer     NOT NULL,
  new_stock         integer     NOT NULL,
  previous_reserved integer     NOT NULL,
  new_reserved      integer     NOT NULL,
  actor_id          uuid,                     -- auth.users reference (soft)
  actor_name        text,
  reason            text,
  idempotency_key   text        UNIQUE,       -- prevents duplicate writes
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 4. Indexes
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inv_tx_variant
  ON public.inventory_transactions (variant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_tx_order
  ON public.inventory_transactions (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_type
  ON public.inventory_transactions (movement_type, created_at DESC);

-- RLS: service_role writes, authenticated reads (audit log)
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'inventory_transactions'
      AND policyname = 'inv_tx_service_write'
  ) THEN
    CREATE POLICY inv_tx_service_write
      ON public.inventory_transactions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'inventory_transactions'
      AND policyname = 'inv_tx_auth_read'
  ) THEN
    CREATE POLICY inv_tx_auth_read
      ON public.inventory_transactions
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;


-- ===========================================================
-- 5. RPC: increment_variant_reserved_stock
--
-- Called on order creation / pending → confirmed.
-- Raises an exception if available stock < requested quantity.
-- Idempotent via idempotency_key.
--
-- FIX: p_variant_id changed from uuid → bigint.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.increment_variant_reserved_stock(
  p_variant_id    bigint,          -- ← bigint: matches product_variants.id
  p_quantity      integer,
  p_order_id      uuid    DEFAULT NULL,
  p_actor_id      uuid    DEFAULT NULL,
  p_actor_name    text    DEFAULT NULL,
  p_reason        text    DEFAULT 'order_reservation',
  p_idempotency   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock     integer;
  v_reserved  integer;
  v_available integer;
BEGIN
  -- Idempotency: skip if this key was already recorded
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM public.inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Lock the variant row to prevent concurrent race conditions
  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  v_available := v_stock - v_reserved;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION
      'Insufficient stock for variant %. Available: %, Requested: %',
      p_variant_id, v_available, p_quantity;
  END IF;

  UPDATE public.product_variants
    SET reserved_stock = reserved_stock + p_quantity,
        updated_at     = now()
    WHERE id = p_variant_id;

  INSERT INTO public.inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, 'reservation', p_quantity,
    v_stock,      v_stock,
    v_reserved,   v_reserved + p_quantity,
    p_actor_id, p_actor_name, p_reason, p_idempotency
  );
END;
$$;


-- ===========================================================
-- 6. RPC: decrement_variant_reserved_stock
--
-- Called on cancellation / release.
-- Clamps to 0 — never goes negative on reserved_stock.
--
-- FIX: p_variant_id changed from uuid → bigint.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.decrement_variant_reserved_stock(
  p_variant_id    bigint,          -- ← bigint
  p_quantity      integer,
  p_order_id      uuid    DEFAULT NULL,
  p_actor_id      uuid    DEFAULT NULL,
  p_actor_name    text    DEFAULT NULL,
  p_reason        text    DEFAULT 'order_cancellation',
  p_idempotency   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock    integer;
  v_reserved integer;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM public.inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  UPDATE public.product_variants
    SET reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at     = now()
    WHERE id = p_variant_id;

  INSERT INTO public.inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, 'release', p_quantity,
    v_stock, v_stock,
    v_reserved, GREATEST(0, v_reserved - p_quantity),
    p_actor_id, p_actor_name, p_reason, p_idempotency
  );
END;
$$;


-- ===========================================================
-- 7. RPC: convert_reservation_to_sale
--
-- Called on delivery: decrements both stock and reserved_stock.
-- This is the "finalise" step — reservation becomes a permanent sale.
--
-- FIX: p_variant_id changed from uuid → bigint.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.convert_reservation_to_sale(
  p_variant_id    bigint,          -- ← bigint
  p_quantity      integer,
  p_order_id      uuid    DEFAULT NULL,
  p_actor_id      uuid    DEFAULT NULL,
  p_actor_name    text    DEFAULT NULL,
  p_idempotency   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock    integer;
  v_reserved integer;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM public.inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  UPDATE public.product_variants
    SET stock          = GREATEST(0, stock - p_quantity),
        reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at     = now()
    WHERE id = p_variant_id;

  INSERT INTO public.inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, 'sale', p_quantity,
    v_stock,      GREATEST(0, v_stock    - p_quantity),
    v_reserved,   GREATEST(0, v_reserved - p_quantity),
    p_actor_id, p_actor_name, 'order_delivered', p_idempotency
  );
END;
$$;


-- ===========================================================
-- 8. RPC: restore_variant_stock
--
-- Called on return or configurable refund restoration.
-- Adds back to stock (not reserved) — item is physically back.
--
-- FIX: p_variant_id changed from uuid → bigint.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.restore_variant_stock(
  p_variant_id    bigint,          -- ← bigint
  p_quantity      integer,
  p_movement_type text    DEFAULT 'return',   -- 'return' | 'refund'
  p_order_id      uuid    DEFAULT NULL,
  p_actor_id      uuid    DEFAULT NULL,
  p_actor_name    text    DEFAULT NULL,
  p_reason        text    DEFAULT NULL,
  p_idempotency   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock    integer;
  v_reserved integer;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM public.inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  UPDATE public.product_variants
    SET stock      = stock + p_quantity,
        updated_at = now()
    WHERE id = p_variant_id;

  INSERT INTO public.inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, p_movement_type, p_quantity,
    v_stock,      v_stock + p_quantity,
    v_reserved,   v_reserved,
    p_actor_id, p_actor_name, p_reason, p_idempotency
  );
END;
$$;


-- ===========================================================
-- 9. RPC: get_fulfillment_metrics
--
-- Returns dashboard aggregate stats.
-- No parameter changes needed — no variant_id param here.
--
-- Uses order_v2_status and return_status columns added by
-- 20260718200000_order_management_v2_foundation.sql.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.get_fulfillment_metrics()
RETURNS TABLE (
  reserved_stock_total  bigint,
  available_stock_total bigint,
  low_stock_variants    bigint,
  out_of_stock_variants bigint,
  pending_shipments     bigint,
  returns_awaiting      bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(pv.reserved_stock), 0)::bigint              AS reserved_stock_total,
    COALESCE(SUM(pv.stock - pv.reserved_stock), 0)::bigint   AS available_stock_total,
    COUNT(*) FILTER (
      WHERE (pv.stock - pv.reserved_stock) > 0
        AND (pv.stock - pv.reserved_stock) <= 10
    )::bigint                                                 AS low_stock_variants,
    COUNT(*) FILTER (
      WHERE (pv.stock - pv.reserved_stock) = 0
    )::bigint                                                 AS out_of_stock_variants,
    (
      SELECT COUNT(*) FROM public.orders o
      WHERE o.order_v2_status IN ('confirmed', 'processing', 'packed')
    )::bigint                                                 AS pending_shipments,
    (
      SELECT COUNT(*) FROM public.orders o
      WHERE o.return_status = 'requested'
    )::bigint                                                 AS returns_awaiting
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE p.active = TRUE;
$$;
