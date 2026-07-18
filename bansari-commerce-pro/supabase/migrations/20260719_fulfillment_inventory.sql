-- ===========================================================
-- FULFILLMENT & INVENTORY INTEGRATION — Migration
-- ===========================================================
-- Run order:
--   1. Add reserved_stock to product_variants (if not present)
--   2. Create inventory_transactions table
--   3. Create idempotency index
--   4. Create RPC: increment_variant_reserved_stock
--   5. Create RPC: decrement_variant_reserved_stock
--   6. Create RPC: convert_reservation_to_sale
--   7. Create RPC: restore_variant_stock
--   8. Create RPC: get_fulfillment_metrics
-- ===========================================================

-- -----------------------------------------------------------
-- 1. Ensure product_variants has reserved_stock column
-- -----------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants'
      AND column_name = 'reserved_stock'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN reserved_stock integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Prevent negative stock or reserved_stock on variants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_variants'
      AND constraint_name = 'chk_variant_stock_non_negative'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT chk_variant_stock_non_negative
      CHECK (stock >= 0 AND reserved_stock >= 0 AND reserved_stock <= stock);
  END IF;
END $$;

-- -----------------------------------------------------------
-- 2. inventory_transactions table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      uuid        NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  order_id        uuid        REFERENCES orders(id) ON DELETE SET NULL,
  movement_type   text        NOT NULL CHECK (
                                movement_type IN (
                                  'reservation', 'release', 'sale',
                                  'return', 'refund',
                                  'manual_adjustment', 'damage', 'lost', 'capture'
                                )
                              ),
  quantity        integer     NOT NULL,
  previous_stock  integer     NOT NULL,
  new_stock       integer     NOT NULL,
  previous_reserved integer  NOT NULL,
  new_reserved    integer     NOT NULL,
  actor_id        uuid,
  actor_name      text,
  reason          text,
  idempotency_key text        UNIQUE,          -- prevents duplicate writes
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_variant
  ON inventory_transactions (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_order
  ON inventory_transactions (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_tx_type
  ON inventory_transactions (movement_type, created_at DESC);

-- -----------------------------------------------------------
-- 3. RPC: increment_variant_reserved_stock
--    Called on order creation / confirmation.
--    Prevents overselling: raises if available < quantity.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_variant_reserved_stock(
  p_variant_id    uuid,
  p_quantity      integer,
  p_order_id      uuid        DEFAULT NULL,
  p_actor_id      uuid        DEFAULT NULL,
  p_actor_name    text        DEFAULT NULL,
  p_reason        text        DEFAULT 'order_reservation',
  p_idempotency   text        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock          integer;
  v_reserved       integer;
  v_available      integer;
BEGIN
  -- Idempotency: skip if key already recorded
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Lock row for update to prevent race conditions
  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM product_variants
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

  -- Increment reserved
  UPDATE product_variants
    SET reserved_stock = reserved_stock + p_quantity,
        updated_at     = now()
    WHERE id = p_variant_id;

  -- Record transaction
  INSERT INTO inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, 'reservation', p_quantity,
    v_stock, v_stock,
    v_reserved, v_reserved + p_quantity,
    p_actor_id, p_actor_name, p_reason, p_idempotency
  );
END;
$$;

-- -----------------------------------------------------------
-- 4. RPC: decrement_variant_reserved_stock
--    Called on cancellation / release.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION decrement_variant_reserved_stock(
  p_variant_id    uuid,
  p_quantity      integer,
  p_order_id      uuid        DEFAULT NULL,
  p_actor_id      uuid        DEFAULT NULL,
  p_actor_name    text        DEFAULT NULL,
  p_reason        text        DEFAULT 'order_cancellation',
  p_idempotency   text        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock     integer;
  v_reserved  integer;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  -- Clamp to 0 — never go negative on reserved
  UPDATE product_variants
    SET reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at     = now()
    WHERE id = p_variant_id;

  INSERT INTO inventory_transactions (
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

-- -----------------------------------------------------------
-- 5. RPC: convert_reservation_to_sale
--    Called on delivery: reduces both stock and reserved.
--    This is the "finalise" step — reservation → permanent sale.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_reservation_to_sale(
  p_variant_id    uuid,
  p_quantity      integer,
  p_order_id      uuid        DEFAULT NULL,
  p_actor_id      uuid        DEFAULT NULL,
  p_actor_name    text        DEFAULT NULL,
  p_idempotency   text        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock     integer;
  v_reserved  integer;
BEGIN
  IF p_idempotency IS NOT NULL THEN
    PERFORM 1 FROM inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  UPDATE product_variants
    SET stock          = GREATEST(0, stock - p_quantity),
        reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at     = now()
    WHERE id = p_variant_id;

  INSERT INTO inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, 'sale', p_quantity,
    v_stock, GREATEST(0, v_stock - p_quantity),
    v_reserved, GREATEST(0, v_reserved - p_quantity),
    p_actor_id, p_actor_name, 'order_delivered', p_idempotency
  );
END;
$$;

-- -----------------------------------------------------------
-- 6. RPC: restore_variant_stock
--    Called on return / configurable refund restoration.
--    Adds back to stock (not reserved) — item is physically back.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION restore_variant_stock(
  p_variant_id    uuid,
  p_quantity      integer,
  p_movement_type text        DEFAULT 'return',   -- 'return' | 'refund'
  p_order_id      uuid        DEFAULT NULL,
  p_actor_id      uuid        DEFAULT NULL,
  p_actor_name    text        DEFAULT NULL,
  p_reason        text        DEFAULT NULL,
  p_idempotency   text        DEFAULT NULL
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
    PERFORM 1 FROM inventory_transactions
      WHERE idempotency_key = p_idempotency
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  SELECT stock, reserved_stock
    INTO v_stock, v_reserved
    FROM product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  UPDATE product_variants
    SET stock      = stock + p_quantity,
        updated_at = now()
    WHERE id = p_variant_id;

  INSERT INTO inventory_transactions (
    variant_id, order_id, movement_type, quantity,
    previous_stock, new_stock,
    previous_reserved, new_reserved,
    actor_id, actor_name, reason, idempotency_key
  ) VALUES (
    p_variant_id, p_order_id, p_movement_type, p_quantity,
    v_stock, v_stock + p_quantity,
    v_reserved, v_reserved,
    p_actor_id, p_actor_name, p_reason, p_idempotency
  );
END;
$$;

-- -----------------------------------------------------------
-- 7. RPC: get_fulfillment_metrics
--    Returns dashboard aggregate stats.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_fulfillment_metrics()
RETURNS TABLE (
  reserved_stock_total    bigint,
  available_stock_total   bigint,
  low_stock_variants      bigint,
  out_of_stock_variants   bigint,
  pending_shipments       bigint,
  returns_awaiting        bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(pv.reserved_stock), 0)::bigint                      AS reserved_stock_total,
    COALESCE(SUM(pv.stock - pv.reserved_stock), 0)::bigint           AS available_stock_total,
    COUNT(*) FILTER (
      WHERE (pv.stock - pv.reserved_stock) > 0
        AND (pv.stock - pv.reserved_stock) <= 10
    )::bigint                                                         AS low_stock_variants,
    COUNT(*) FILTER (
      WHERE (pv.stock - pv.reserved_stock) = 0
    )::bigint                                                         AS out_of_stock_variants,
    (
      SELECT COUNT(*) FROM orders o
      WHERE o.order_v2_status IN ('confirmed','processing','packed')
    )::bigint                                                         AS pending_shipments,
    (
      SELECT COUNT(*) FROM orders o
      WHERE o.return_status = 'requested'
    )::bigint                                                         AS returns_awaiting
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.active = TRUE;
$$;
