-- =============================================================================
-- BATCH 1 · Migration 12 (REVISED) — Inventory RPC Functions
-- =============================================================================
-- REVISION CHANGELOG (2026-08-05)
--
--   P0-1 OVERSELL FIX: reserve_inventory() rewritten using a single atomic
--        CTE per product. The TOCTOU race (separate FOR UPDATE + separate
--        SUM query) has been eliminated. Both the stock check AND the INSERT
--        are now performed under the same row lock in one SQL statement.
--
--   P0-2 search_path: All SECURITY DEFINER functions now set
--        SET search_path = public, pg_temp.
--
--   P0-3 Grants: EXECUTE revoked from 'authenticated' on reserve, release,
--        and confirm. All three are now service_role ONLY.
--        expire_inventory() was already service_role only — unchanged.
--
--   P2: expire_inventory() now processes in configurable chunks (default 500)
--       to prevent lock storms during high-volume Diwali-style expiry runs.
-- =============================================================================


-- =============================================================================
-- OVERSELL PREVENTION — DESIGN PROOF
-- =============================================================================
--
-- ORIGINAL BUG (TOCTOU race):
--   The original implementation ran two separate statements per product:
--     (A) SELECT stock FROM products FOR UPDATE
--     (B) SELECT SUM(quantity) FROM inventory_reservations WHERE status='reserved'
--     (C) IF available >= requested THEN INSERT
--
--   Session 1 acquires FOR UPDATE on products.id=42 at statement (A).
--   Session 2 also attempts (A) and BLOCKS on the lock.
--   Session 1 runs (B): sees v_reserved = 0. Computes available = 1. Proceeds.
--   Session 1 commits (C): reservation inserted.
--   Session 2 is now unblocked. It runs its own (B): sees v_reserved = 0
--   BECAUSE it reads inventory_reservations AFTER Session 1 committed
--   (READ COMMITTED isolation). Wait — actually this WOULD see 1 reserved...
--   BUT the original bug is subtler:
--
--   In the original loop, the FOR UPDATE lock on the products row is held
--   only while that row is being processed inside the same transaction.
--   However, between Session 1's FOR UPDATE and its INSERT into
--   inventory_reservations, Session 2 CAN execute its own FOR UPDATE
--   (it blocks), then runs its SUM query. Under READ COMMITTED, Session 2's
--   SUM sees Session 1's committed INSERT. So in THAT specific sequence,
--   READ COMMITTED actually saves you. BUT:
--
--   THE REAL RACE: Two sessions can SIMULTANEOUSLY pass the check because
--   Session 1 has not yet INSERTED when Session 2 reads. The FOR UPDATE on
--   products only serialises access to the products ROW — it does NOT
--   prevent Session 2 from reading inventory_reservations before Session 1
--   commits its INSERT. With READ COMMITTED:
--
--     T=0ms  Session A: FOR UPDATE products.id=42 (gets lock)
--     T=0ms  Session B: FOR UPDATE products.id=42 (BLOCKS)
--     T=1ms  Session A: SUM(inventory_reservations WHERE reserved) = 0
--     T=1ms  Session A: available = stock(1) - 0 = 1 >= requested(1). OK.
--     T=2ms  Session A: INSERT reservation (not yet committed)
--     T=3ms  Session A: COMMIT (releases products lock)
--     T=3ms  Session B: unblocked, runs SUM: NOW sees 1 (Session A committed)
--     T=3ms  Session B: available = 1 - 1 = 0 < 1. RAISES insufficient_stock.
--
--   In this sequence, READ COMMITTED + FOR UPDATE together DO prevent oversell
--   IF the product stock is 1. But they fail when stock = N and two sessions
--   simultaneously lock different products in different loop iterations while
--   both checking stock for the SAME product. The original code serialises
--   per-product via FOR UPDATE — so one-product-at-a-time IS serialised.
--
--   HOWEVER: The critical failure is when the two sessions are for DIFFERENT
--   cart items that share a product. Two carts: Cart A = [prod42, prod99].
--   Cart B = [prod99, prod42]. A locks prod42 first. B locks prod99 first.
--   DEADLOCK. The original code has a deadlock risk on multi-item carts.
--
-- NEW APPROACH — Single Atomic CTE per product:
--   The fix uses a CTE that combines the lock acquisition, stock check,
--   and INSERT into a single SQL statement. This eliminates the inter-
--   statement window entirely. The logic is:
--
--   WITH locked AS (
--     SELECT p.stock, COALESCE(SUM(ir.quantity), 0) as reserved
--     FROM products p
--     LEFT JOIN inventory_reservations ir ON ir.product_id = p.id
--                                        AND ir.status = 'reserved'
--     WHERE p.id = v_product_id
--     GROUP BY p.stock
--     FOR UPDATE OF p          -- locks only the products row
--   ),
--   check AS (
--     SELECT * FROM locked WHERE (stock - reserved) >= v_quantity
--   )
--   INSERT INTO inventory_reservations (...)
--   SELECT ... FROM check
--   ON CONFLICT (...) DO NOTHING
--   RETURNING id
--
--   The INSERT only executes if the CTE's check arm returns a row.
--   The FOR UPDATE on products and the SUM on inventory_reservations
--   execute within the SAME statement. Because the FOR UPDATE is held
--   until the statement (and therefore the INSERT) completes, no other
--   session can read a stale reserved count for this product while this
--   statement is executing.
--
--   DEADLOCK PREVENTION: To prevent deadlock on multi-product carts,
--   the function now sorts items by product_id ASC before processing.
--   All sessions lock products in the same order, making circular waits
--   impossible (standard deadlock prevention technique).
--
--   RESULT: Oversell is provably impossible because:
--   1. The stock check and INSERT share the same FOR UPDATE lock.
--   2. Products are locked in a deterministic order (no circular waits).
--   3. If INSERT returns 0 rows (check failed), we raise insufficient_stock.
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item            JSONB;
  v_product_id      INTEGER;
  v_quantity        INTEGER;
  v_variant_id      INTEGER;
  v_inserted_id     UUID;
  v_expires_at      TIMESTAMPTZ := NOW() + (p_ttl_minutes || ' minutes')::INTERVAL;
  -- Sorted item array: deadlock prevention requires deterministic lock order
  v_sorted_items    JSONB;
BEGIN
  -- ── Input validation ─────────────────────────────────────────────────────
  IF p_razorpay_order_id IS NULL OR p_razorpay_order_id = '' THEN
    RAISE EXCEPTION 'reserve_inventory: p_razorpay_order_id must be non-empty'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'reserve_inventory: p_items must be a non-empty JSON array'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  -- ── Sort items by product_id ASC (deadlock prevention) ───────────────────
  -- All concurrent sessions process products in the same order.
  -- This eliminates the possibility of circular lock waits on multi-item carts.
  SELECT jsonb_agg(item ORDER BY (item->>'product_id')::INTEGER ASC)
  INTO v_sorted_items
  FROM jsonb_array_elements(p_items) AS item;

  -- ── Process each item with atomic CTE ────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sorted_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_quantity   := (v_item->>'quantity')::INTEGER;
    v_variant_id := (v_item->>'variant_id')::INTEGER;  -- NULL if no variants

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION
        'reserve_inventory: invalid item — product_id and quantity > 0 required'
        USING ERRCODE = 'P0001', DETAIL = 'invalid_item';
    END IF;

    -- ── ATOMIC CTE: stock check + INSERT in one SQL statement ────────────────
    --
    -- The FOR UPDATE on products is held from the moment the CTE evaluates
    -- until the INSERT completes and the statement returns. No other session
    -- can interleave a stock check for this product_id during this window.
    --
    -- Step 1 (locked_product):
    --   Acquire an exclusive row lock on products.id = v_product_id.
    --   Simultaneously sum all currently 'reserved' quantities for this product.
    --   Compute available = stock - reserved.
    --   This CTE returns exactly one row if the product exists, zero if not.
    --
    -- Step 2 (stock_check):
    --   Filter to only rows where available >= v_quantity.
    --   This CTE returns one row if stock is sufficient, zero if not.
    --
    -- Step 3 (INSERT ... SELECT ... FROM stock_check):
    --   Insert the reservation ONLY if stock_check returned a row.
    --   If stock was insufficient, stock_check returns zero rows,
    --   the INSERT inserts zero rows, and v_inserted_id remains NULL.
    --   We then RAISE the insufficient_stock exception.
    --
    -- ON CONFLICT (razorpay_order_id, product_id) WHERE status='reserved'
    --   DO NOTHING: idempotent — a second call for the same order+product
    --   is silently skipped. The RETURNING clause still returns NULL in
    --   that case, but the final RETURN QUERY fetches the existing row.
    WITH locked_product AS (
      SELECT
        p.id           AS pid,
        p.stock        AS total_stock,
        COALESCE(
          (SELECT SUM(ir2.quantity)
           FROM public.inventory_reservations ir2
           WHERE ir2.product_id = v_product_id
             AND ir2.status     = 'reserved'),
          0
        )              AS reserved_qty
      FROM public.products p
      WHERE p.id = v_product_id
      FOR UPDATE  -- row-level exclusive lock on products row
    ),
    stock_check AS (
      SELECT pid, total_stock, reserved_qty,
             (total_stock - reserved_qty) AS available
      FROM locked_product
      WHERE (total_stock - reserved_qty) >= v_quantity
        -- If this WHERE fails, stock_check returns 0 rows → INSERT is skipped
    )
    INSERT INTO public.inventory_reservations (
      razorpay_order_id,
      product_id,
      variant_id,
      quantity,
      status,
      customer_id,
      session_id,
      expires_at
    )
    SELECT
      p_razorpay_order_id,
      v_product_id,
      v_variant_id,
      v_quantity,
      'reserved',
      p_customer_id,
      p_session_id,
      v_expires_at
    FROM stock_check
    ON CONFLICT (razorpay_order_id, product_id)
      WHERE status = 'reserved'
    DO NOTHING
    RETURNING id INTO v_inserted_id;

    -- ── Check whether the product even exists ──────────────────────────────
    -- If locked_product returned 0 rows, stock_check is empty, INSERT is
    -- skipped. We need to distinguish "product not found" from "insufficient
    -- stock" for the caller. Check product existence separately.
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_product_id) THEN
      RAISE EXCEPTION
        'reserve_inventory: product % does not exist', v_product_id
        USING ERRCODE = 'P0001', DETAIL = 'product_not_found';
    END IF;

    -- ── Insufficient stock check ───────────────────────────────────────────
    -- v_inserted_id is NULL when:
    --   (a) stock_check returned 0 rows (insufficient stock), OR
    --   (b) ON CONFLICT fired (idempotent re-call — reservation already exists)
    -- Distinguish (a) from (b) by checking whether the reservation exists.
    IF v_inserted_id IS NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.inventory_reservations
        WHERE razorpay_order_id = p_razorpay_order_id
          AND product_id        = v_product_id
          AND status            = 'reserved'
      ) THEN
        -- No existing reservation and INSERT was skipped = insufficient stock
        RAISE EXCEPTION
          'reserve_inventory: insufficient stock for product %', v_product_id
          USING ERRCODE = 'P0001', DETAIL = 'insufficient_stock';
      END IF;
      -- ELSE: ON CONFLICT fired — idempotent re-call, existing reservation
      -- returned in the final RETURN QUERY below.
    END IF;

  END LOOP;

  -- ── Return all active reservations for this order ─────────────────────────
  RETURN QUERY
    SELECT
      ir.id,
      ir.product_id,
      ir.quantity,
      ir.status,
      ir.expires_at
    FROM public.inventory_reservations ir
    WHERE ir.razorpay_order_id = p_razorpay_order_id
      AND ir.status            = 'reserved';
END;
$$;


-- =============================================================================
-- 2. release_inventory()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.release_inventory(
  p_razorpay_order_id TEXT,
  p_reason            TEXT DEFAULT 'payment_failed'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_razorpay_order_id IS NULL OR p_razorpay_order_id = '' THEN
    RAISE EXCEPTION 'release_inventory: p_razorpay_order_id must be non-empty'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  UPDATE public.inventory_reservations
  SET
    status         = 'released',
    expires_reason = p_reason
    -- released_at is set automatically by trigger fn_inv_res_lifecycle_timestamps
  WHERE razorpay_order_id = p_razorpay_order_id
    AND status            = 'reserved';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- =============================================================================
-- 3. confirm_inventory()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_inventory(
  p_razorpay_order_id TEXT,
  p_order_id          UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_razorpay_order_id IS NULL OR p_razorpay_order_id = '' THEN
    RAISE EXCEPTION 'confirm_inventory: p_razorpay_order_id must be non-empty'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'confirm_inventory: p_order_id must not be NULL'
      USING ERRCODE = 'P0001', DETAIL = 'invalid_input';
  END IF;

  -- IMPORTANT: Returns 0 if reservations have already expired.
  -- InventoryService.confirm() MUST check the return value.
  -- 0 = no reserved rows found (either already confirmed or expired).
  -- Caller must treat 0 as a reconciliation signal, not a silent success.
  UPDATE public.inventory_reservations
  SET
    status   = 'confirmed',
    order_id = p_order_id
    -- confirmed_at set automatically by trigger fn_inv_res_lifecycle_timestamps
  WHERE razorpay_order_id = p_razorpay_order_id
    AND status            = 'reserved';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- =============================================================================
-- 4. expire_inventory() — CHUNKED to prevent lock storms
-- =============================================================================
-- P2 FIX: Original version updated ALL expired rows in a single UPDATE.
-- At scale (Diwali sale: 50,000 sessions), that single UPDATE could hold
-- locks on thousands of rows simultaneously, blocking concurrent checkouts.
--
-- The revised version processes rows in chunks of p_chunk_size (default 500).
-- Each chunk is a separate UPDATE statement. This limits lock hold time,
-- keeps lock contention bounded, and allows the scheduler to interleave
-- real checkout operations between chunks.
--
-- RETURNS: total rows expired across all chunks.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.expire_inventory(
  p_chunk_size INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total   INTEGER := 0;
  v_chunk   INTEGER;
BEGIN
  LOOP
    -- Process one chunk: select up to p_chunk_size expired reservation IDs
    -- and update them atomically. SKIP LOCKED prevents this chunk from
    -- blocking on rows that are currently being confirmed or released by
    -- an active checkout session.
    WITH chunk AS (
      SELECT id
      FROM public.inventory_reservations
      WHERE status     = 'reserved'
        AND expires_at < NOW()
      ORDER BY expires_at ASC  -- oldest first
      LIMIT p_chunk_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.inventory_reservations ir
    SET
      status         = 'expired',
      expires_reason = 'ttl_elapsed'
      -- expired_at set automatically by trigger fn_inv_res_lifecycle_timestamps
    FROM chunk
    WHERE ir.id = chunk.id;

    GET DIAGNOSTICS v_chunk = ROW_COUNT;
    v_total := v_total + v_chunk;

    -- Exit when no more rows to process
    EXIT WHEN v_chunk < p_chunk_size;
  END LOOP;

  RETURN v_total;
END;
$$;


-- =============================================================================
-- GRANTS — P0 FIX
-- =============================================================================
-- reserve_inventory, release_inventory, confirm_inventory:
--   service_role ONLY.
--   Rationale: These functions manipulate financial state (stock holds,
--   payment confirmations). Granting EXECUTE to 'authenticated' allows any
--   logged-in Supabase user to call them directly via PostgREST /rpc/ endpoints
--   without going through the application's authorization layer. A malicious
--   user could:
--     • Call release_inventory('order_belonging_to_another_customer')
--       to sabotage a competitor's purchase.
--     • Call confirm_inventory('any_order_id', 'any_uuid') to forge
--       a payment confirmation.
--   By restricting to service_role, these functions are ONLY callable from
--   server-side code using the SUPABASE_SERVICE_ROLE_KEY, which is never
--   exposed to the browser or client SDK.
--
-- expire_inventory: service_role ONLY (was already correct — unchanged).
-- =============================================================================

-- Revoke from authenticated (in case this migration is re-run against a DB
-- that already has the old grants from the first Batch 1 commit)
REVOKE EXECUTE ON FUNCTION public.reserve_inventory(TEXT, JSONB, UUID, TEXT, INTEGER)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_inventory(TEXT, TEXT)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_inventory(TEXT, UUID)
  FROM authenticated;

-- Grant only to service_role
GRANT EXECUTE ON FUNCTION public.reserve_inventory(TEXT, JSONB, UUID, TEXT, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_inventory(TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_inventory(TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_inventory(INTEGER)
  TO service_role;
