-- Orders Foundation (Iteration 1)
-- Creates: public.orders, public.order_items
-- Principle of least privilege: customers may only SELECT their own rows.
-- All writes (insert/update/delete) happen exclusively via the service-role
-- client from trusted server-side code. No authenticated write policies
-- are created, and no GRANT statements are issued.

create extension if not exists pgcrypto;

-- =========================================================================
-- orders
-- =========================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  order_number text not null unique
    check (char_length(order_number) > 0),

  user_id uuid
    references auth.users (id)
    on delete set null,

  -- Customer snapshot (identity at time of order)
  customer_name text not null,
  customer_email text not null,
  customer_phone text,

  -- Shipping snapshot (immutable copy of delivery details at time of order)
  shipping_name text not null,
  shipping_phone text not null,
  shipping_email text,
  shipping_address_line1 text not null,
  shipping_address_line2 text,
  shipping_city text not null,
  shipping_state text not null,
  shipping_postal_code text not null,
  shipping_country text not null default 'IN',

  -- billing_same_as_shipping controls whether the billing_* columns below
  -- are required. When true, billing mirrors the shipping snapshot and the
  -- billing_* columns may be left null.
  billing_same_as_shipping boolean not null default true,

  billing_name text,
  billing_phone text,
  billing_email text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,

  check (
    billing_same_as_shipping = true
    or (
      billing_name is not null
      and billing_phone is not null
      and billing_address_line1 is not null
      and billing_city is not null
      and billing_state is not null
      and billing_postal_code is not null
      and billing_country is not null
    )
  ),

  -- Money
  currency text not null default 'INR'
    check (currency ~ '^[A-Z]{3}$'),

  subtotal numeric(12, 2) not null default 0
    check (subtotal >= 0),
  discount numeric(12, 2) not null default 0
    check (discount >= 0),
  shipping_fee numeric(12, 2) not null default 0
    check (shipping_fee >= 0),
  tax numeric(12, 2) not null default 0
    check (tax >= 0),
  grand_total numeric(12, 2) not null default 0
    check (grand_total >= 0),

  -- Payment
  payment_provider text,
  payment_method text,
  payment_reference text,
  razorpay_order_id text,
  razorpay_payment_id text,

  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),

  -- Lifecycle
  order_status text not null default 'placed'
    check (
      order_status in (
        'placed', 'processing', 'packed',
        'shipped', 'delivered', 'cancelled'
      )
    ),

  notes text,

  payment_verified_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  delivered_at timestamptz,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create index if not exists orders_user_id_idx
  on public.orders (user_id);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_order_status_idx
  on public.orders (order_status);

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

create index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id);

create index if not exists orders_payment_reference_idx
  on public.orders (payment_reference);

alter table public.orders enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Customers can view their own orders'
  ) then
    create policy "Customers can view their own orders"
      on public.orders
      for select
      to authenticated
      using (
        user_id = auth.uid()
        and deleted_at is null
      );
  end if;
end $$;

-- =========================================================================
-- order_items
-- =========================================================================

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id)
    on delete cascade,

  product_id bigint
    references public.products (id)
    on delete set null,

  -- Product snapshot (immutable copy of product details at time of order)
  product_name text not null,
  product_slug text,
  product_sku text,
  product_image text,
  variant_color text,
  variant_size text,

  unit_price numeric(12, 2) not null
    check (unit_price >= 0),
  quantity integer not null
    check (quantity > 0),
  line_total numeric(12, 2) not null
    check (line_total >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists order_items_set_updated_at on public.order_items;

create trigger order_items_set_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

alter table public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Customers can view their own order items'
  ) then
    create policy "Customers can view their own order items"
      on public.order_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.orders
          where orders.id = order_items.order_id
            and orders.user_id = auth.uid()
        )
      );
  end if;
end $$;
