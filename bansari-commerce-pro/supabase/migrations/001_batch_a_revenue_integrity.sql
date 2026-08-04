-- =============================================================================
-- BATCH A: Revenue & Order Integrity
-- Migration: 001_batch_a_revenue_integrity.sql
-- =============================================================================
-- Run order:
--   1. coupons table
--   2. inventory_reservations table
--   3. pending_orders columns (discount_amount, final_amount, coupon_id, reservation_id)
--   4. DB functions for reservation lifecycle
--   5. DB function for coupon usage increment
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COUPONS
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id               bigserial primary key,
  code             text        not null,
  discount_type    text        not null check (discount_type in ('flat', 'percent')),
  discount_value   numeric(10,2) not null check (discount_value > 0),
  min_order_value  numeric(10,2) not null default 0,
  max_discount     numeric(10,2) null,          -- cap for percent coupons
  usage_limit      integer     null,            -- null = unlimited
  used_count       integer     not null default 0,
  valid_from       timestamptz not null default now(),
  valid_until      timestamptz null,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists coupons_code_idx
  on public.coupons (upper(code));

alter table public.coupons enable row level security;

-- Service role has full access; anon/authenticated users cannot read/write directly.
create policy "service_role_all" on public.coupons
  for all using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. INVENTORY RESERVATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_reservations (
  id                 uuid        primary key default gen_random_uuid(),
  razorpay_order_id  text        not null,
  items              jsonb       not null default '[]',
  status             text        not null default 'reserved'
                                check (status in ('reserved', 'confirmed', 'released')),
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists inv_res_rzp_order_idx
  on public.inventory_reservations (razorpay_order_id)
  where status = 'reserved';

create index if not exists inv_res_expires_idx
  on public.inventory_reservations (expires_at)
  where status = 'reserved';

alter table public.inventory_reservations enable row level security;

create policy "service_role_all" on public.inventory_reservations
  for all using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. PENDING_ORDERS: add new columns (idempotent via IF NOT EXISTS)
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'pending_orders' and column_name = 'discount_amount'
  ) then
    alter table public.pending_orders add column discount_amount numeric(10,2) not null default 0;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'pending_orders' and column_name = 'final_amount'
  ) then
    alter table public.pending_orders add column final_amount numeric(10,2) null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'pending_orders' and column_name = 'coupon_id'
  ) then
    alter table public.pending_orders add column coupon_id bigint references public.coupons(id) null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'pending_orders' and column_name = 'reservation_id'
  ) then
    alter table public.pending_orders add column reservation_id uuid references public.inventory_reservations(id) null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4a. reserve_inventory_stock
--
-- Atomically:
--   - Creates an inventory_reservation row
--   - For each item, decrements available_qty and increments reserved_qty
--     in the inventory table using the DEFAULT warehouse.
--   - Raises exception if any item has insufficient available stock.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_inventory_stock(
  p_razorpay_order_id text,
  p_items             jsonb,
  p_ttl_minutes       int  default 30
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_reservation_id uuid;
  v_item           jsonb;
  v_product_id     int;
  v_variant_id     int;
  v_quantity       int;
  v_available      int;
  v_inventory_id   int;
begin
  -- Insert reservation record first
  insert into public.inventory_reservations (
    razorpay_order_id, items, status, expires_at
  ) values (
    p_razorpay_order_id,
    p_items,
    'reserved',
    now() + (p_ttl_minutes || ' minutes')::interval
  )
  returning id into v_reservation_id;

  -- Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::int;
    v_variant_id := nullif(v_item->>'variant_id', 'null')::int;
    v_quantity   := (v_item->>'quantity')::int;

    -- Find the default-warehouse inventory record
    select i.id, i.available_qty
      into v_inventory_id, v_available
    from public.inventory i
    join public.warehouses w on w.id = i.warehouse_id
    where i.product_id = v_product_id
      and (v_variant_id is null or i.variant_id = v_variant_id)
      and w.is_default = true
    limit 1
    for update;  -- row-level lock prevents concurrent overselling

    if not found then
      raise exception 'inventory record not found for product_id=%', v_product_id;
    end if;

    if v_available < v_quantity then
      raise exception 'insufficient stock for product_id=% (available=%, requested=%)',
        v_product_id, v_available, v_quantity;
    end if;

    update public.inventory
       set available_qty = available_qty - v_quantity,
           reserved_qty  = reserved_qty  + v_quantity,
           updated_at    = now()
     where id = v_inventory_id;
  end loop;

  return v_reservation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4b. release_inventory_reservation
--
-- Reverses the reservation: increments available_qty, decrements reserved_qty.
-- Idempotent: no-op if already released/confirmed.
-- ---------------------------------------------------------------------------
create or replace function public.release_inventory_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_items    jsonb;
  v_item     jsonb;
begin
  -- Lock and check status atomically
  update public.inventory_reservations
     set status     = 'released',
         updated_at = now()
   where id = p_reservation_id
     and status = 'reserved'
  returning items into v_items;

  -- If no row updated, already released/confirmed — idempotent no-op
  if v_items is null then
    return;
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    update public.inventory
       set available_qty = available_qty + (v_item->>'quantity')::int,
           reserved_qty  = greatest(0, reserved_qty - (v_item->>'quantity')::int),
           updated_at    = now()
     where product_id = (v_item->>'product_id')::int
       and (
         (v_item->>'variant_id') is null
         or variant_id = nullif(v_item->>'variant_id', 'null')::int
       )
       and warehouse_id = (
         select id from public.warehouses where is_default = true limit 1
       );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4c. confirm_inventory_reservation
--
-- Payment confirmed: move status reserved → confirmed, decrement reserved_qty.
-- available_qty was already decremented at reservation time — do not touch it.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_inventory_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_items jsonb;
  v_item  jsonb;
begin
  update public.inventory_reservations
     set status     = 'confirmed',
         updated_at = now()
   where id = p_reservation_id
     and status = 'reserved'
  returning items into v_items;

  if v_items is null then
    return; -- already confirmed or released
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    update public.inventory
       set reserved_qty = greatest(0, reserved_qty - (v_item->>'quantity')::int),
           updated_at   = now()
     where product_id = (v_item->>'product_id')::int
       and (
         (v_item->>'variant_id') is null
         or variant_id = nullif(v_item->>'variant_id', 'null')::int
       )
       and warehouse_id = (
         select id from public.warehouses where is_default = true limit 1
       );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4d. release_expired_reservations
--
-- Sweeps all reservations past their expires_at and releases them.
-- Intended for a scheduled cron job (pg_cron or Supabase Edge Function).
-- Returns the count of reservations released.
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
as $$
declare
  v_id    uuid;
  v_count int := 0;
begin
  for v_id in
    select id from public.inventory_reservations
    where status = 'reserved' and expires_at < now()
    for update skip locked
  loop
    perform public.release_inventory_reservation(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. increment_coupon_usage
--
-- Atomically increments used_count only if usage_limit is NULL or
-- used_count < usage_limit. Returns TRUE if incremented.
-- ---------------------------------------------------------------------------
create or replace function public.increment_coupon_usage(
  p_code text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_incremented boolean := false;
begin
  update public.coupons
     set used_count = used_count + 1,
         updated_at = now()
   where upper(code) = upper(p_code)
     and is_active   = true
     and (usage_limit is null or used_count < usage_limit)
  returning true into v_incremented;

  return coalesce(v_incremented, false);
end;
$$;
