-- Migration: create pending_orders
-- Purpose:   Server-side persistence of cart + customer + shipping metadata
--            BEFORE opening Razorpay.  Webhook recovery reads this table to
--            reconstruct a complete order without any browser involvement.
--
-- Lifecycle:
--   1. /api/payment/create-order writes a row after computing the Razorpay
--      order.  Row status = 'pending'.
--   2. /api/orders/create marks status = 'consumed' after writing the final
--      order row.  This is the idempotency lock that prevents duplicate orders
--      from browser retries.
--   3. Webhook recovery reads status = 'pending' to recreate a complete order
--      when the browser closed before step 2.
--   4. A pg_cron job (or Supabase edge function) can DELETE rows older than
--      24 h to keep the table small.  expires_at is indexed for this.

BEGIN;

CREATE TABLE IF NOT EXISTS pending_orders (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id  TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'consumed', 'recovered')),

  -- Computed pricing (authoritative — never from client)
  subtotal           NUMERIC(12, 2) NOT NULL,
  shipping_fee       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total        NUMERIC(12, 2) NOT NULL,
  currency           TEXT        NOT NULL DEFAULT 'INR',
  coupon_code        TEXT,

  -- Serialised line items: [{productId, productName, quantity, unitPrice, lineTotal}]
  items_json         JSONB       NOT NULL,

  -- Customer contact
  customer_name      TEXT        NOT NULL,
  customer_email     TEXT        NOT NULL,
  customer_phone     TEXT,

  -- Shipping address
  shipping_name          TEXT    NOT NULL,
  shipping_phone         TEXT    NOT NULL,
  shipping_email         TEXT,
  shipping_address_line1 TEXT    NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city          TEXT    NOT NULL,
  shipping_state         TEXT    NOT NULL,
  shipping_postal_code   TEXT    NOT NULL,
  shipping_country       TEXT    NOT NULL DEFAULT 'IN',

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Fast lookup by Razorpay order id (used in webhook recovery + idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS pending_orders_razorpay_order_id_idx
  ON pending_orders (razorpay_order_id);

-- Auto-cleanup support
CREATE INDEX IF NOT EXISTS pending_orders_expires_at_idx
  ON pending_orders (expires_at);

-- Disable RLS — this table is only ever accessed via the service-role client
-- from server-side API routes.  It is never exposed to Supabase's auto-API.
ALTER TABLE pending_orders DISABLE ROW LEVEL SECURITY;

COMMIT;
