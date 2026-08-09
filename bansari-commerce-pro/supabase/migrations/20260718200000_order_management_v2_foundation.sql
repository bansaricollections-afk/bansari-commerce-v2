-- ============================================================
-- Order Management V2 Foundation
-- Extends existing `orders` and `order_items` tables.
-- Creates new `order_timeline` and `order_shipments` tables.
-- ALL changes are additive (no DROP, no RENAME of existing cols).
-- ============================================================

-- ============================================================
-- 1. EXTEND orders TABLE
-- ============================================================

ALTER TABLE orders
  -- V2 Status
  ADD COLUMN IF NOT EXISTS order_v2_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_v2_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS shipment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS exchange_status TEXT NOT NULL DEFAULT 'none',

  -- Shipment / Courier
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS courier_awb TEXT,
  ADD COLUMN IF NOT EXISTS courier_url TEXT,
  ADD COLUMN IF NOT EXISTS shipping_weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_dimensions TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,

  -- Return
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS return_notes TEXT,
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ,

  -- Exchange
  ADD COLUMN IF NOT EXISTS exchange_order_id UUID REFERENCES orders(id),

  -- Refund
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,

  -- Documents
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packing_slip_number TEXT,
  ADD COLUMN IF NOT EXISTS packing_slip_generated_at TIMESTAMPTZ,

  -- Notes
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS packing_notes TEXT,

  -- Payment V2
  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB;

-- Indexes for common admin filter queries
CREATE INDEX IF NOT EXISTS idx_orders_order_v2_status ON orders (order_v2_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON orders (shipment_status);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders (return_status);
CREATE INDEX IF NOT EXISTS idx_orders_courier_awb ON orders (courier_awb) WHERE courier_awb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders (invoice_number) WHERE invoice_number IS NOT NULL;

-- ============================================================
-- 2. EXTEND order_items TABLE
-- ============================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_sku TEXT,
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS returned_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchanged_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_gift BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gift_message TEXT;

-- ============================================================
-- 3. CREATE order_timeline TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor_id UUID,           -- admin user id (nullable for system events)
  actor_name TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline (order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_at ON order_timeline (created_at DESC);

-- Immutable: prevent UPDATE and DELETE on timeline rows
CREATE OR REPLACE FUNCTION order_timeline_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_timeline rows are immutable';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_timeline_immutable_upd ON order_timeline;
CREATE TRIGGER trg_order_timeline_immutable_upd
  BEFORE UPDATE ON order_timeline
  FOR EACH ROW EXECUTE FUNCTION order_timeline_immutable();

DROP TRIGGER IF EXISTS trg_order_timeline_immutable_del ON order_timeline;
CREATE TRIGGER trg_order_timeline_immutable_del
  BEFORE DELETE ON order_timeline
  FOR EACH ROW EXECUTE FUNCTION order_timeline_immutable();

-- ============================================================
-- 4. CREATE order_shipments TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL,
  awb_number TEXT NOT NULL,
  tracking_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  weight_grams INTEGER,
  dimensions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_awb ON order_shipments (awb_number);

-- ============================================================
-- 5. DOCUMENT NUMBER SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START 1000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_packing_slip_number START 1000 INCREMENT 1;

-- Helper: generate invoice number like INV-2026-001000
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  BIGINT;
BEGIN
  v_seq := nextval('seq_invoice_number');
  RETURN 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- Helper: generate packing slip number like PS-2026-001000
CREATE OR REPLACE FUNCTION generate_packing_slip_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  BIGINT;
BEGIN
  v_seq := nextval('seq_packing_slip_number');
  RETURN 'PS-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- 6. RLS — service role bypasses; anon/authenticated cannot
--    read order_timeline or order_shipments directly.
-- ============================================================

ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (bypasses RLS by default in Supabase)
-- Block all other roles
CREATE POLICY IF NOT EXISTS "order_timeline: deny anon" ON order_timeline
  FOR ALL TO anon USING (FALSE);
CREATE POLICY IF NOT EXISTS "order_shipments: deny anon" ON order_shipments
  FOR ALL TO anon USING (FALSE);
