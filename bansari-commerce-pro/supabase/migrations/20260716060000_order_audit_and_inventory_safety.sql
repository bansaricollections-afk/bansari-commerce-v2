-- =============================================================================
-- order_audit_trail
-- =============================================================================
-- Append-only log of order lifecycle events.
-- Events: created, paid, cancelled, refunded, shipped, delivered
-- Never overwrite; one row per event.
-- =============================================================================

create table if not exists public.order_audit_trail (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null,
  event       text        not null
    check (event in ('created', 'paid', 'cancelled', 'refunded', 'shipped', 'delivered', 'processing', 'packed', 'placed')),
  actor       text        not null default 'system',
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Fast lookup of all events for a given order.
create index if not exists order_audit_trail_order_id_idx
  on public.order_audit_trail (order_id, created_at);

-- Prevent any UPDATE or DELETE on audit rows (immutable log).
create or replace rule order_audit_trail_no_update as
  on update to public.order_audit_trail do instead nothing;

create or replace rule order_audit_trail_no_delete as
  on delete to public.order_audit_trail do instead nothing;

-- RLS: service-role only (bypasses RLS).
alter table public.order_audit_trail enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'order_audit_trail'
      and policyname = 'order_audit_trail: no direct access'
  ) then
    create policy "order_audit_trail: no direct access"
      on public.order_audit_trail
      as restrictive
      for all
      using (false);
  end if;
end $$;


-- =============================================================================
-- admin_audit_log
-- =============================================================================
-- Append-only log of admin mutations.
-- Covers: product_create, product_update, product_delete, price_change,
--         stock_change, order_status_change, coupon_changes, category_rename
-- =============================================================================

create table if not exists public.admin_audit_log (
  id           uuid        primary key default gen_random_uuid(),
  action       text        not null,
  entity_type  text        not null,
  entity_id    text        not null,
  user_id      uuid,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity_type, entity_id, created_at);

create index if not exists admin_audit_log_user_idx
  on public.admin_audit_log (user_id, created_at);

-- Immutable log rules.
create or replace rule admin_audit_log_no_update as
  on update to public.admin_audit_log do instead nothing;

create or replace rule admin_audit_log_no_delete as
  on delete to public.admin_audit_log do instead nothing;

alter table public.admin_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'admin_audit_log'
      and policyname = 'admin_audit_log: no direct access'
  ) then
    create policy "admin_audit_log: no direct access"
      on public.admin_audit_log
      as restrictive
      for all
      using (false);
  end if;
end $$;


-- =============================================================================
-- pending_orders: add missing columns (IF NOT EXISTS guards, idempotent)
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'currency'
  ) then
    alter table public.pending_orders
      add column currency text not null default 'INR';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'coupon_code'
  ) then
    alter table public.pending_orders
      add column coupon_code text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'discount_amount'
  ) then
    alter table public.pending_orders
      add column discount_amount numeric(10,2) default 0;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'shipping_amount'
  ) then
    alter table public.pending_orders
      add column shipping_amount numeric(10,2) default 0;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'tax_amount'
  ) then
    alter table public.pending_orders
      add column tax_amount numeric(10,2) default 0;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pending_orders'
      and column_name  = 'notes'
  ) then
    alter table public.pending_orders
      add column notes text;
  end if;
end $$;


-- =============================================================================
-- Inventory safety: decrement_product_stock hardened
-- =============================================================================
-- Replace the existing RPC with a version that:
--   1. Raises an exception if stock would go negative.
--   2. Uses a CHECK constraint on products.stock to enforce non-negative at DB level.
-- =============================================================================

-- Add non-negative constraint to products.stock if missing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname  = 'products_stock_non_negative'
  ) then
    alter table public.products
      add constraint products_stock_non_negative check (stock >= 0);
  end if;
end $$;

-- Replace (or create) the decrement_product_stock function.
create or replace function public.decrement_product_stock(
  p_product_id integer,
  p_quantity    integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stock integer;
begin
  -- Lock the row exclusively to prevent concurrent decrements.
  select stock
    into v_current_stock
    from public.products
   where id = p_product_id
     for update;

  if not found then
    raise exception 'Product % does not exist.', p_product_id
      using errcode = 'P0001';
  end if;

  if v_current_stock < p_quantity then
    raise exception 'Insufficient stock for product %. Available: %, requested: %.',
      p_product_id, v_current_stock, p_quantity
      using errcode = 'P0002';
  end if;

  update public.products
     set stock      = stock - p_quantity,
         updated_at = now()
   where id = p_product_id;
end;
$$;

revoke all on function public.decrement_product_stock(integer, integer) from public;
grant execute on function public.decrement_product_stock(integer, integer) to service_role;
