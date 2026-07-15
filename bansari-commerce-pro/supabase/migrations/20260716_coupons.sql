-- Migration: create coupons table
-- Apply via: supabase db push  OR  paste into Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.coupons (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text          NOT NULL UNIQUE,
  description    text,
  discount_type  text          NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order      numeric(10,2) NOT NULL DEFAULT 0,
  max_uses       integer,
  uses_count     integer       NOT NULL DEFAULT 0,
  active         boolean       NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coupons IS
  'Discount coupon codes. discount_type=percentage applies discount_value% off; flat deducts flat INR amount.';

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Service-role client bypasses RLS automatically.
-- No additional policies needed for admin-only access.

-- Index for fast code lookups at checkout
CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (code);
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (active) WHERE active = true;
