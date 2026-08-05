-- =============================================================================
-- BATCH 1 · Migration 12 — Inventory RPC Functions
-- =============================================================================
-- Four atomic functions that manage the complete reservation lifecycle.
--
-- ARCHITECTURAL PRINCIPLES
--   • Every function is SECURITY DEFINER so callers need no direct table access.
--   • Every function is idempotent — safe to call multiple times.
--   • confirm_inventory() does NOT decrement stock directly.
--     That is the responsibility of InventoryService.adjustStock().
--     Separation of concerns: reservation ≠ stock ledger.
--   • All functions operate within an implicit transaction (each function body
--     is a single SQL transaction when called from PL/pgSQL BEGIN...END).
-- =============================================================================

-- =============================================================================
-- 1. reserve_inventory(p_razorpay_order_id, p_items)
-- =============================================================================
-- Atomically checks available stock and inserts reservation rows.
--
-- p_items JSONB format:
--   [{"product_id": 42, "quantity": 2}, ...]
--
-- OVERSELL PREVENTION
--   Uses SELECT ... FOR UPDATE on each products row to serialise concurrent
--   checkouts. Available stock = products.stock - SUM(reserved quantity).
--   Raises exception 'P0001' with detail 'insufficient_stock' if any product
--   cannot satisfy the requested quantity.
--
-- RETURNS TABLE with one row per reserved item:
--   (reservation_id, product_id, quantity, status, expires_at)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_razorpay_order_id TEXT,
  p_items             JSONB,
  p_customer_id       UUID    DEFAULT NULL,
  p_session_id        TEXT    DEFAULT NULL,
  p_ttl_minutes       INTEGER DEFAULT 15
)
RETURNS TABLE (
  reservation_id  UUID,
  product_id      INTEGER,
  quantity        INTEGER,
  status          public.inventory_reservation_status,
  expires_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item          JSONB;
  v_product_id    INTEGER;
  v_quantity      INTEGER;
  v_stock         INTEGER;
  v_reserved      INTEGER;
  v_available     INTEGER;
  v_expires_at    TIMESTAMPTZ := NOW() + (p_ttl_minutes || ' minutes')::INTERVAL;
BEGIN
  -- ── Validate input ────────────────────────────────────────────────────────
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'reserve_inventory: p_items must be a non-empty JSON array'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  -- ── Process each item ────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_quantity   := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'reserve_inventory: invalid item — product_id and quantity > 0 required'
        USING ERRCODE = 'P0001', DETAIL = 'invalid_item';
    END IF;

    -- Lock the product row to serialise concurrent reservations
    SELECT p.stock INTO v_stock
    FROM public.products p
    WHERE p.id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reserve_inventory: product % does not exist', v_product_id
        USING ERRCODE = 'P0001', DETAIL = 'product_not_found';
    END IF;

    -- Count currently active (reserved) quantity for this product
    SELECT COALESCE(SUM(ir.quantity), 0) INTO v_reserved
    FROM public.inventory_reservations ir
    WHERE ir.product_id = v_product_id
      AND ir.status = 'reserved';

    v_available := v_stock - v_reserved;

    IF v_available < v_quantity THEN
      RAISE EXCEPTION
        'reserve_inventory: insufficient stock for product % (available: %, requested: %)',
        v_product_id, v_available, v_quantity
        USING ERRCODE = 'P0001', DETAIL = 'insufficient_stock';
    END IF;

    -- Insert reservation — idempotent via ON CONFLICT DO NOTHING on the
    -- partial unique index (razorpay_order_id, product_id) WHERE reserved.
    INSERT INTO public.inventory_reservations (
      razorpay_order_id,
      product_id,
      quantity,
      status,
      customer_id,
      session_id,
      expires_at
    )
    VALUES (
      p_razorpay_order_id,
      v_product_id,
      v_quantity,
      'reserved',
      p_customer_id,
      p_session_id,
      v_expires_at
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Return inserted rows ──────────────────────────────────────────────────
  RETURN QUERY
    SELECT
      ir.id,
      ir.product_id,
      ir.quantity,
      ir.status,
      ir.expires_at
    FROM public.inventory_reservations ir
    WHERE ir.razorpay_order_id = p_razorpay_order_id
      AND ir.status = 'reserved';
END;
$$;

-- =============================================================================
-- 2. release_inventory(p_razorpay_order_id, p_reason)
-- =============================================================================
-- Transitions all 'reserved' rows for the given order to 'released'.
-- Idempotent: safe to call on an order that has no reserved rows.
--
-- RETURNS INTEGER: count of rows transitioned (0 = already released / expired).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.release_inventory(
  p_razorpay_order_id TEXT,
  p_reason            TEXT DEFAULT 'payment_failed'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.inventory_reservations
  SET
    status         = 'released',
    expires_reason = p_reason
  WHERE razorpay_order_id = p_razorpay_order_id
    AND status            = 'reserved';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================================
-- 3. confirm_inventory(p_razorpay_order_id, p_order_id)
-- =============================================================================
-- Transitions all 'reserved' rows to 'confirmed' and links them to the
-- newly created order.
--
-- CRITICAL DESIGN DECISION
--   This function does NOT decrement products.stock.
--   Stock adjustment is a separate responsibility owned by InventoryService
--   .adjustStock() → decrement_product_stock() RPC.
--   This separation ensures:
--     • Reservation confirmation and stock accounting are independently
--       auditable and independently retryable.
--     • A reservation can be confirmed even if the stock decrement is
--       temporarily unavailable (retry separately).
--
-- Idempotent: if status is already 'confirmed', RETURNS 0 (no-op).
--
-- RETURNS INTEGER: count of rows transitioned.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_inventory(
  p_razorpay_order_id TEXT,
  p_order_id          UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.inventory_reservations
  SET
    status   = 'confirmed',
    order_id = p_order_id
  WHERE razorpay_order_id = p_razorpay_order_id
    AND status            = 'reserved';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================================
-- 4. expire_inventory()
-- =============================================================================
-- Batch job function — transitions all TTL-elapsed 'reserved' rows to 'expired'.
-- Designed to be called by pg_cron or a Supabase Edge Function on a schedule
-- (e.g. every 5 minutes).
--
-- No arguments: operates on the global set of expired reservations.
-- Safe to call concurrently — the WHERE clause is deterministic.
--
-- RETURNS INTEGER: count of rows expired (use for monitoring / alerting).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.expire_inventory()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.inventory_reservations
  SET
    status         = 'expired',
    expires_reason = 'ttl_elapsed'
  WHERE status     = 'reserved'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute to authenticated and service_role principals.
-- PostgREST will expose these as /rpc/ endpoints if desired.
GRANT EXECUTE ON FUNCTION public.reserve_inventory(TEXT, JSONB, UUID, TEXT, INTEGER)
  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.release_inventory(TEXT, TEXT)
  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_inventory(TEXT, UUID)
  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_inventory()
  TO service_role;
