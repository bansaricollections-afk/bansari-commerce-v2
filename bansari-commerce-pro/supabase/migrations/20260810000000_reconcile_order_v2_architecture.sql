-- =============================================================================
-- Reconcile Order V2 architecture against the ACTUAL live production schema.
--
-- Supersedes (does not edit) 20260718200000_order_management_v2_foundation.sql,
-- whose design (orders.id uuid, granular shipping_*/billing_* columns,
-- CREATE POLICY IF NOT EXISTS) never matched live production.
--
-- Live public.orders.id is bigint. Live public.orders.customer_id is an
-- unused legacy/drift column — left untouched. Live public.orders.items and
-- public.orders.shipping_address (jsonb) already exist and are preserved.
--
-- This migration is purely additive: no DROP, no data mutation, no rename
-- of any existing column.
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. Extend public.orders with the canonical identity + payment metadata
--    columns, plus the Order V2 status/fulfillment columns.
-- -----------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),

  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS order_v2_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_v2_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS shipment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS exchange_status TEXT NOT NULL DEFAULT 'none',

  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS courier_awb TEXT,
  ADD COLUMN IF NOT EXISTS courier_url TEXT,
  ADD COLUMN IF NOT EXISTS shipping_weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_dimensions TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,

  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS return_notes TEXT,
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ,

  -- Self-referencing FK corrected to bigint (orders.id is bigint, not uuid).
  ADD COLUMN IF NOT EXISTS exchange_order_id BIGINT REFERENCES public.orders(id),

  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packing_slip_number TEXT,
  ADD COLUMN IF NOT EXISTS packing_slip_generated_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS packing_notes TEXT,

  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_v2_status ON public.orders (order_v2_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON public.orders (shipment_status);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON public.orders (return_status);
CREATE INDEX IF NOT EXISTS idx_orders_courier_awb ON public.orders (courier_awb) WHERE courier_awb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders (invoice_number) WHERE invoice_number IS NOT NULL;

-- -----------------------------------------------------------------------
-- 2. public.order_items — canonical relational line-item table.
--    order_id corrected to bigint (orders.id is bigint, not uuid).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id BIGINT NOT NULL
    REFERENCES public.orders (id)
    ON DELETE CASCADE,

  product_id BIGINT
    REFERENCES public.products (id)
    ON DELETE SET NULL,

  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_sku TEXT,
  product_image TEXT,
  variant_color TEXT,
  variant_size TEXT,

  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS order_items_set_updated_at ON public.order_items;
CREATE TRIGGER order_items_set_updated_at
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);

-- Order V2 item fields (approved: nullable/defaulted, no invented values)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_sku TEXT,
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS returned_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchanged_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_gift BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gift_message TEXT;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Customers can view their own order items'
  ) THEN
    CREATE POLICY "Customers can view their own order items"
      ON public.order_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.orders
          WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'order_items_service_write'
  ) THEN
    CREATE POLICY "order_items_service_write"
      ON public.order_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- 3. public.order_timeline — order_id corrected to bigint.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON public.order_timeline (order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_at ON public.order_timeline (created_at DESC);

CREATE OR REPLACE FUNCTION public.order_timeline_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_timeline rows are immutable';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_timeline_immutable_upd ON public.order_timeline;
CREATE TRIGGER trg_order_timeline_immutable_upd
  BEFORE UPDATE ON public.order_timeline
  FOR EACH ROW EXECUTE FUNCTION public.order_timeline_immutable();

DROP TRIGGER IF EXISTS trg_order_timeline_immutable_del ON public.order_timeline;
CREATE TRIGGER trg_order_timeline_immutable_del
  BEFORE DELETE ON public.order_timeline
  FOR EACH ROW EXECUTE FUNCTION public.order_timeline_immutable();

ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_timeline'
      AND policyname = 'order_timeline_deny_anon'
  ) THEN
    CREATE POLICY "order_timeline_deny_anon"
      ON public.order_timeline
      FOR ALL
      TO anon
      USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_timeline'
      AND policyname = 'order_timeline_service_write'
  ) THEN
    CREATE POLICY "order_timeline_service_write"
      ON public.order_timeline
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_timeline'
      AND policyname = 'order_timeline_auth_read'
  ) THEN
    CREATE POLICY "order_timeline_auth_read"
      ON public.order_timeline
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- 4. public.order_shipments — order_id corrected to bigint.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON public.order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_awb ON public.order_shipments (awb_number);

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_shipments'
      AND policyname = 'order_shipments_deny_anon'
  ) THEN
    CREATE POLICY "order_shipments_deny_anon"
      ON public.order_shipments
      FOR ALL
      TO anon
      USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_shipments'
      AND policyname = 'order_shipments_service_write'
  ) THEN
    CREATE POLICY "order_shipments_service_write"
      ON public.order_shipments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_shipments'
      AND policyname = 'order_shipments_auth_read'
  ) THEN
    CREATE POLICY "order_shipments_auth_read"
      ON public.order_shipments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- 5. Document number sequences + generators (no order_id dependency).
-- -----------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START 1000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_packing_slip_number START 1000 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  BIGINT;
BEGIN
  v_seq := nextval('seq_invoice_number');
  RETURN 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_packing_slip_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  BIGINT;
BEGIN
  v_seq := nextval('seq_packing_slip_number');
  RETURN 'PS-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- -----------------------------------------------------------------------
-- 6. Reconcile create_order_with_items() against the ACTUAL live schema.
--    Atomically writes orders + orders.items + order_items.
--    Signature, return type, and transaction semantics unchanged.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_order JSONB,
  p_items JSONB
)
RETURNS public.orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_order public.orders;
BEGIN
  INSERT INTO public.orders (
    order_number, user_id,
    customer_name, customer_email, customer_phone,
    shipping_address,
    currency,
    subtotal, discount, shipping, tax, total,
    payment_provider, payment_method, payment_reference,
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    payment_status, order_status,
    payment_verified_at, paid_at,
    items
  )
  SELECT
    p_order ->> 'order_number',
    NULLIF(p_order ->> 'user_id', '')::uuid,
    p_order ->> 'customer_name',
    p_order ->> 'customer_email',
    p_order ->> 'customer_phone',
    p_order -> 'shipping_address',
    COALESCE(p_order ->> 'currency', 'INR'),
    (p_order ->> 'subtotal')::numeric,
    (p_order ->> 'discount')::numeric,
    (p_order ->> 'shipping_fee')::numeric,
    (p_order ->> 'tax')::numeric,
    (p_order ->> 'grand_total')::numeric,
    COALESCE(p_order ->> 'payment_provider', 'razorpay'),
    p_order ->> 'payment_method',
    p_order ->> 'payment_reference',
    p_order ->> 'razorpay_order_id',
    p_order ->> 'razorpay_payment_id',
    p_order ->> 'razorpay_signature',
    p_order ->> 'payment_status',
    p_order ->> 'order_status',
    (p_order ->> 'payment_verified_at')::timestamptz,
    (p_order ->> 'paid_at')::timestamptz,
    COALESCE(p_items, '[]'::jsonb)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_slug, product_sku,
    product_image, variant_color, variant_size,
    unit_price, quantity, line_total,
    variant_id, variant_sku, mrp,
    returned_quantity, exchanged_quantity, is_gift, gift_message
  )
  SELECT
    v_order.id,
    (item ->> 'product_id')::bigint,
    item ->> 'product_name',
    item ->> 'product_slug',
    item ->> 'product_sku',
    item ->> 'product_image',
    NULL,
    NULL,
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total')::numeric,
    NULL,
    NULL,
    NULL,
    0,
    0,
    FALSE,
    NULL
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_order;
END;
$$;

-- -----------------------------------------------------------------------
-- 7. Reconcile get_fulfillment_metrics() — now unblocked since
--    order_v2_status/return_status exist on orders. Return shape and
--    fulfillment.service.ts contract unchanged.
-- -----------------------------------------------------------------------
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
