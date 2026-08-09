-- ============================================================
-- Order Management V2 Foundation — reconciled with live schema
--
-- Production orders uses bigint ids and already has shipping_address jsonb,
-- subtotal/shipping/tax/discount/total, and Razorpay fields. This migration
-- restores the application contract additively and preserves existing data.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_email TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_state TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS billing_same_as_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
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
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS return_notes TEXT,
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exchange_order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_v2_status ON public.orders(order_v2_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON public.orders(shipment_status);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON public.orders(return_status);
CREATE INDEX IF NOT EXISTS idx_orders_courier_awb ON public.orders(courier_awb) WHERE courier_awb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number) WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_sku TEXT,
  product_image TEXT,
  variant_color TEXT,
  variant_size TEXT,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  variant_id BIGINT REFERENCES public.product_variants(id) ON DELETE SET NULL,
  variant_sku TEXT,
  mrp NUMERIC(12,2),
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  exchanged_quantity INTEGER NOT NULL DEFAULT 0,
  is_gift BOOLEAN NOT NULL DEFAULT FALSE,
  gift_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

DROP TRIGGER IF EXISTS order_items_set_updated_at ON public.order_items;
CREATE TRIGGER order_items_set_updated_at
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON public.order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created_at ON public.order_timeline(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON public.order_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_awb ON public.order_shipments(awb_number);

CREATE OR REPLACE FUNCTION public.order_timeline_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_timeline rows are immutable';
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

DROP TRIGGER IF EXISTS order_shipments_set_updated_at ON public.order_shipments;
CREATE TRIGGER order_shipments_set_updated_at
BEFORE UPDATE ON public.order_shipments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.seq_invoice_number START 1000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_packing_slip_number START 1000 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.seq_invoice_number');
  RETURN 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_packing_slip_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.seq_packing_slip_number');
  RETURN 'PS-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='order_items'
      AND policyname='Customers can view their own order items'
  ) THEN
    CREATE POLICY "Customers can view their own order items"
      ON public.order_items FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='order_timeline'
      AND policyname='Customers can view their own order timeline'
  ) THEN
    CREATE POLICY "Customers can view their own order timeline"
      ON public.order_timeline FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_timeline.order_id
          AND o.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='order_shipments'
      AND policyname='Customers can view their own order shipments'
  ) THEN
    CREATE POLICY "Customers can view their own order shipments"
      ON public.order_shipments FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_shipments.order_id
          AND o.user_id = auth.uid()
      ));
  END IF;
END $$;

-- ============================================================
-- 7. ORDER CREATION FUNCTION — aligned to the reconciled schema
-- ============================================================

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
    order_number,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_name,
    shipping_phone,
    shipping_email,
    shipping_address,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    payment_status,
    order_status,
    created_at,
    updated_at,
    payment_method,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    notes,
    items,
    currency,
    payment_provider,
    payment_reference,
    payment_verified_at,
    paid_at,
    shipping_fee,
    grand_total
  )
  SELECT
    p_order->>'order_number',
    NULLIF(p_order->>'user_id', '')::UUID,
    p_order->>'customer_name',
    p_order->>'customer_email',
    p_order->>'customer_phone',
    p_order->>'shipping_name',
    p_order->>'shipping_phone',
    p_order->>'shipping_email',
    jsonb_build_object(
      'name', p_order->>'shipping_name',
      'phone', p_order->>'shipping_phone',
      'email', NULLIF(p_order->>'shipping_email', ''),
      'addressLine1', p_order->>'shipping_address_line1',
      'addressLine2', NULLIF(p_order->>'shipping_address_line2', ''),
      'city', p_order->>'shipping_city',
      'state', p_order->>'shipping_state',
      'postalCode', p_order->>'shipping_postal_code',
      'country', COALESCE(NULLIF(p_order->>'shipping_country', ''), 'IN')
    ),
    COALESCE((p_order->>'subtotal')::NUMERIC, 0),
    COALESCE((p_order->>'shipping_fee')::NUMERIC, 0),
    COALESCE((p_order->>'tax')::NUMERIC, 0),
    COALESCE((p_order->>'discount')::NUMERIC, 0),
    COALESCE((p_order->>'grand_total')::NUMERIC, 0),
    COALESCE(p_order->>'payment_status', 'pending'),
    COALESCE(p_order->>'order_status', 'placed'),
    NOW(),
    NOW(),
    p_order->>'payment_method',
    p_order->>'razorpay_order_id',
    p_order->>'razorpay_payment_id',
    p_order->>'razorpay_signature',
    p_order->>'notes',
    COALESCE(p_items, '[]'::JSONB),
    COALESCE(NULLIF(p_order->>'currency', ''), 'INR'),
    COALESCE(NULLIF(p_order->>'payment_provider', ''), 'razorpay'),
    p_order->>'payment_reference',
    (p_order->>'payment_verified_at')::TIMESTAMPTZ,
    (p_order->>'paid_at')::TIMESTAMPTZ,
    COALESCE((p_order->>'shipping_fee')::NUMERIC, 0),
    COALESCE((p_order->>'grand_total')::NUMERIC, 0)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    product_slug,
    product_sku,
    product_image,
    variant_color,
    variant_size,
    unit_price,
    quantity,
    line_total,
    variant_id,
    variant_sku,
    mrp,
    returned_quantity,
    exchanged_quantity,
    is_gift,
    gift_message
  )
  SELECT
    v_order.id,
    NULLIF(item->>'product_id', '')::BIGINT,
    item->>'product_name',
    NULLIF(item->>'product_slug', ''),
    NULLIF(item->>'product_sku', ''),
    NULLIF(item->>'product_image', ''),
    NULLIF(item->>'variant_color', ''),
    NULLIF(item->>'variant_size', ''),
    (item->>'unit_price')::NUMERIC,
    (item->>'quantity')::INTEGER,
    (item->>'line_total')::NUMERIC,
    NULLIF(item->>'variant_id', '')::BIGINT,
    NULLIF(item->>'variant_sku', ''),
    NULLIF(item->>'mrp', '')::NUMERIC,
    COALESCE(NULLIF(item->>'returned_quantity', '')::INTEGER, 0),
    COALESCE(NULLIF(item->>'exchanged_quantity', '')::INTEGER, 0),
    COALESCE(NULLIF(item->>'is_gift', '')::BOOLEAN, FALSE),
    NULLIF(item->>'gift_message', '')
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) AS item;

  RETURN v_order;
END;
$$;
