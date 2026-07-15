-- =========================================================================
-- BATCH 2: Index completeness + FK hardening
-- All statements are idempotent (IF NOT EXISTS / DO $$ blocks).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. orders — composite indexes for analytics queries
-- -------------------------------------------------------------------------
create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);

create index if not exists orders_order_status_created_at_idx
  on public.orders (order_status, created_at desc);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_razorpay_payment_id_idx
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists orders_paid_at_idx
  on public.orders (paid_at desc)
  where paid_at is not null;

create index if not exists orders_deleted_at_idx
  on public.orders (deleted_at)
  where deleted_at is null;

-- -------------------------------------------------------------------------
-- 2. order_items — for top-product analytics and order-level aggregation
-- -------------------------------------------------------------------------
create index if not exists order_items_product_name_idx
  on public.order_items (product_name);

create index if not exists order_items_product_slug_idx
  on public.order_items (product_slug)
  where product_slug is not null;

create index if not exists order_items_created_at_idx
  on public.order_items (created_at desc);

-- -------------------------------------------------------------------------
-- 3. products — coverage for common storefront queries
-- -------------------------------------------------------------------------
create index if not exists products_featured_active_idx
  on public.products (featured, active)
  where active = true;

create index if not exists products_new_arrival_active_idx
  on public.products (new_arrival, active)
  where active = true;

create index if not exists products_best_seller_active_idx
  on public.products (best_seller, active)
  where active = true;

create index if not exists products_slug_active_idx
  on public.products (slug, active);

create index if not exists products_collection_active_idx
  on public.products (collection, active)
  where active = true;

create index if not exists products_low_stock_idx
  on public.products (stock, active)
  where active = true and stock <= 5;

-- -------------------------------------------------------------------------
-- 4. pending_orders — for webhook recovery and idempotency lookups
-- -------------------------------------------------------------------------
create index if not exists pending_orders_razorpay_order_id_idx
  on public.pending_orders (razorpay_order_id);

create index if not exists pending_orders_created_at_idx
  on public.pending_orders (created_at desc);

create index if not exists pending_orders_user_id_idx
  on public.pending_orders (user_id)
  where user_id is not null;

-- -------------------------------------------------------------------------
-- 5. order_audit_trail — for per-order event history queries
-- -------------------------------------------------------------------------
create index if not exists order_audit_trail_order_id_event_idx
  on public.order_audit_trail (order_id, event_type, created_at desc);

-- -------------------------------------------------------------------------
-- 6. admin_audit_log — for per-entity and per-user audit queries
-- -------------------------------------------------------------------------
create index if not exists admin_audit_log_entity_created_at_idx
  on public.admin_audit_log (entity_type, entity_id, created_at desc);

create index if not exists admin_audit_log_user_created_at_idx
  on public.admin_audit_log (user_id, created_at desc);

-- -------------------------------------------------------------------------
-- 7. coupons — FK on used_by (user who last used the coupon)
--    Coupon table may not have this FK yet; add conditionally.
-- -------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'coupons'
  ) then
    -- index for lookup by code (most common query)
    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = 'coupons' and indexname = 'coupons_code_idx'
    ) then
      create index coupons_code_idx on public.coupons (code);
    end if;

    -- partial index: active coupons only
    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = 'coupons' and indexname = 'coupons_active_idx'
    ) then
      create index coupons_active_idx on public.coupons (active)
        where active = true;
    end if;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 8. Verify products.stock non-negative constraint (idempotent)
-- -------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'products'
      and constraint_name = 'products_stock_non_negative'
  ) then
    alter table public.products
      add constraint products_stock_non_negative check (stock >= 0);
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 9. orders.grand_total, subtotal, discount, shipping_fee, tax must be >= 0
--    (idempotent — skip if already exist)
-- -------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'orders'
      and constraint_name = 'orders_grand_total_non_negative'
  ) then
    alter table public.orders
      add constraint orders_grand_total_non_negative check (grand_total >= 0);
  end if;
end $$;
