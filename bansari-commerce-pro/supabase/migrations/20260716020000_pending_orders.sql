-- =============================================================================
-- pending_orders
-- =============================================================================
-- Purpose: server-side cart snapshot created by /api/orders/create-order
--          immediately after the Razorpay order is opened.
--
-- Lifecycle:
--   pending   → order opened, payment in flight
--   consumed  → /api/orders/create committed an orders row for this payment
--   recovered → webhook recovery committed an orders row (browser never called back)
--
-- Rows are never deleted by application code.  An automated cleanup function
-- (see 20260716030000_pending_orders_cleanup.sql) purges expired rows after
-- 48 hours to keep the table lean without destroying audit data.
--
-- Depends on: 20260702001523_initial_schema.sql  (pgcrypto)
--             (no dependency on orders — pending_orders is written first)
-- =============================================================================

create table if not exists public.pending_orders (
  id                    uuid        primary key default gen_random_uuid(),

  -- Razorpay identifiers -------------------------------------------------------
  razorpay_order_id     text        not null,

  -- Lifecycle ------------------------------------------------------------------
  status                text        not null default 'pending'
    check (status in ('pending', 'consumed', 'recovered')),

  -- Pricing (server-computed, never from client) --------------------------------
  subtotal              numeric(12,2) not null check (subtotal >= 0),
  shipping_fee          numeric(12,2) not null check (shipping_fee >= 0),
  discount              numeric(12,2) not null default 0 check (discount >= 0),
  grand_total           numeric(12,2) not null check (grand_total >= 0),

  -- Cart snapshot (JSONB array of line-item objects) ---------------------------
  -- Each element: { productId, productName, unitPrice, quantity, lineTotal }
  items_json            jsonb       not null default '[]'::jsonb,

  -- Customer snapshot ----------------------------------------------------------
  customer_name         text        not null,
  customer_email        text        not null,
  customer_phone        text,

  -- Shipping snapshot ----------------------------------------------------------
  shipping_name         text        not null,
  shipping_phone        text        not null,
  shipping_email        text,
  shipping_address_line1 text       not null,
  shipping_address_line2 text,
  shipping_city         text        not null,
  shipping_state        text        not null,
  shipping_postal_code  text        not null,
  shipping_country      text        not null default 'IN',

  -- Expiry ---------------------------------------------------------------------
  -- Row is considered stale after expires_at. Razorpay orders expire in 15 min
  -- by default; we keep the row for 24 h so webhook recovery can still use it.
  expires_at            timestamptz not null default (now() + interval '24 hours'),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Idempotency: one pending_orders row per Razorpay order.
-- UPSERT in create-order uses ON CONFLICT on this column.
create unique index if not exists pending_orders_razorpay_order_id_udx
  on public.pending_orders (razorpay_order_id);

-- Range scan for cleanup function and webhook recovery.
create index if not exists pending_orders_expires_at_idx
  on public.pending_orders (expires_at);

-- Fast status filter used by orders/create and webhook recovery.
create index if not exists pending_orders_status_idx
  on public.pending_orders (status)
  where status = 'pending';

-- updated_at trigger (reuses set_updated_at from initial_schema migration).
drop trigger if exists pending_orders_set_updated_at on public.pending_orders;
create trigger pending_orders_set_updated_at
  before update on public.pending_orders
  for each row
  execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------
-- pending_orders is an internal server table.  No browser/anon/authenticated
-- client should ever read or write it directly — all access is via the
-- service-role client which bypasses RLS automatically.
--
-- We still enable RLS so that if a misconfigured Supabase client with anon
-- or authenticated credentials ever reaches this table it gets denied.
alter table public.pending_orders enable row level security;

-- Explicitly deny all access to non-service-role callers.
-- (Service-role bypasses RLS; these policies only affect weaker roles.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pending_orders'
      and policyname = 'pending_orders: no direct access'
  ) then
    create policy "pending_orders: no direct access"
      on public.pending_orders
      as restrictive
      for all
      using (false);
  end if;
end $$;
