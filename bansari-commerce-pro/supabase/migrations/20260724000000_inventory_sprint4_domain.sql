-- =============================================================================
-- INVENTORY SPRINT-4: DOMAIN TABLES
-- warehouses, vendors, purchase_orders, purchase_order_items, stock_transfers
--
-- Depends on:
--   public.products          (20260702001523_initial_schema.sql)
--   public.product_variants  (20260718_inventory_v1.sql)
--   public.set_updated_at()  (defined in 20260702001523_initial_schema.sql)
--   auth.users               (Supabase built-in)
--
-- Column provenance (all verified against existing migrations before authoring):
--   products          : id bigint, name text, sku text        (20260702001523)
--   product_variants  : id bigserial, sku text, size text,
--                       cost_price numeric(12,2)              (20260718_v1)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. WAREHOUSES
-- ---------------------------------------------------------------------------
create table if not exists public.warehouses (
  id          bigserial     primary key,
  name        text          not null,
  code        text          not null unique,
  address     text,
  is_default  boolean       not null default false,
  is_active   boolean       not null default true,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_warehouses_is_active
  on public.warehouses (is_active)
  where is_active = true;

alter table public.warehouses enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'warehouses'
      and policyname = 'Warehouses are readable by authenticated users'
  ) then
    create policy "Warehouses are readable by authenticated users"
      on public.warehouses for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'warehouses'
      and policyname = 'Authenticated users can manage warehouses'
  ) then
    create policy "Authenticated users can manage warehouses"
      on public.warehouses for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.warehouses is
  'Physical or logical stock-holding locations. One row may be flagged is_default.';


-- ---------------------------------------------------------------------------
-- 2. VENDORS
-- ---------------------------------------------------------------------------
create table if not exists public.vendors (
  id            bigserial     primary key,
  name          text          not null,
  code          text          not null unique,
  gstin         text,
  email         text,
  phone         text,
  address       text,
  payment_terms integer       not null default 30
                                check (payment_terms >= 0),
  is_active     boolean       not null default true,
  created_at    timestamptz   not null default now()
);

create index if not exists idx_vendors_is_active
  on public.vendors (is_active)
  where is_active = true;

alter table public.vendors enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vendors'
      and policyname = 'Vendors are readable by authenticated users'
  ) then
    create policy "Vendors are readable by authenticated users"
      on public.vendors for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vendors'
      and policyname = 'Authenticated users can manage vendors'
  ) then
    create policy "Authenticated users can manage vendors"
      on public.vendors for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.vendors is
  'Suppliers and trade partners. Referenced by purchase orders.';


-- ---------------------------------------------------------------------------
-- 3. PURCHASE ORDERS
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id            bigserial       primary key,
  po_number     text            not null unique,
  vendor_id     bigint          not null
                                  references public.vendors (id)
                                  on delete restrict,
  warehouse_id  bigint          not null
                                  references public.warehouses (id)
                                  on delete restrict,
  status        text            not null default 'draft'
                                  check (status in (
                                    'draft', 'sent', 'partial',
                                    'received', 'cancelled'
                                  )),
  order_date    timestamptz     not null default now(),
  expected_date date,
  subtotal      numeric(14, 2)  not null default 0
                                  check (subtotal    >= 0),
  tax_amount    numeric(14, 2)  not null default 0
                                  check (tax_amount  >= 0),
  total_amount  numeric(14, 2)  not null default 0
                                  check (total_amount >= 0),
  notes         text,
  created_by    uuid            not null references auth.users (id),
  updated_by    uuid            not null references auth.users (id),
  created_at    timestamptz     not null default now(),
  updated_at    timestamptz     not null default now()
);

create index if not exists idx_purchase_orders_vendor_id
  on public.purchase_orders (vendor_id, created_at desc);

create index if not exists idx_purchase_orders_warehouse_id
  on public.purchase_orders (warehouse_id, created_at desc);

create index if not exists idx_purchase_orders_status
  on public.purchase_orders (status, created_at desc);

-- Reuse the set_updated_at() function already defined in the initial migration.
drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

alter table public.purchase_orders enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchase_orders'
      and policyname = 'Purchase orders are readable by authenticated users'
  ) then
    create policy "Purchase orders are readable by authenticated users"
      on public.purchase_orders for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchase_orders'
      and policyname = 'Authenticated users can manage purchase orders'
  ) then
    create policy "Authenticated users can manage purchase orders"
      on public.purchase_orders for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.purchase_orders is
  'Procurement orders raised against a vendor targeting a specific warehouse.';


-- ---------------------------------------------------------------------------
-- 4. PURCHASE ORDER ITEMS
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_order_items (
  id            bigserial       primary key,
  po_id         bigint          not null
                                  references public.purchase_orders (id)
                                  on delete cascade,
  product_id    bigint          not null
                                  references public.products (id)
                                  on delete restrict,
  variant_id    bigint
                                  references public.product_variants (id)
                                  on delete restrict,
  ordered_qty   integer         not null check (ordered_qty  > 0),
  received_qty  integer         not null default 0
                                  check (received_qty  >= 0),
  damaged_qty   integer         not null default 0
                                  check (damaged_qty   >= 0),
  unit_cost     numeric(12, 2)  not null check (unit_cost  >= 0),
  total_cost    numeric(14, 2)  not null check (total_cost >= 0),
  hsn_code      text
);

create index if not exists idx_purchase_order_items_po_id
  on public.purchase_order_items (po_id);

create index if not exists idx_purchase_order_items_variant_id
  on public.purchase_order_items (variant_id)
  where variant_id is not null;

create index if not exists idx_purchase_order_items_product_id
  on public.purchase_order_items (product_id);

alter table public.purchase_order_items enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchase_order_items'
      and policyname = 'Purchase order items are readable by authenticated users'
  ) then
    create policy "Purchase order items are readable by authenticated users"
      on public.purchase_order_items for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchase_order_items'
      and policyname = 'Authenticated users can manage purchase order items'
  ) then
    create policy "Authenticated users can manage purchase order items"
      on public.purchase_order_items for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.purchase_order_items is
  'Line items for a purchase order. Cascade-deleted when the parent PO is removed.';


-- ---------------------------------------------------------------------------
-- 5. STOCK TRANSFERS
-- ---------------------------------------------------------------------------
create table if not exists public.stock_transfers (
  id                bigserial     primary key,
  from_warehouse_id bigint        not null
                                    references public.warehouses (id)
                                    on delete restrict,
  to_warehouse_id   bigint        not null
                                    references public.warehouses (id)
                                    on delete restrict,
  product_id        bigint        not null
                                    references public.products (id)
                                    on delete restrict,
  variant_id        bigint
                                    references public.product_variants (id)
                                    on delete restrict,
  quantity          integer       not null check (quantity > 0),
  status            text          not null default 'pending'
                                    check (status in (
                                      'pending', 'in_transit',
                                      'completed', 'cancelled'
                                    )),
  notes             text,
  initiated_by      uuid          not null references auth.users (id),
  initiated_at      timestamptz   not null default now(),
  completed_at      timestamptz,
  constraint chk_stock_transfers_distinct_warehouses
    check (from_warehouse_id <> to_warehouse_id)
);

create index if not exists idx_stock_transfers_from_warehouse_id
  on public.stock_transfers (from_warehouse_id, initiated_at desc);

create index if not exists idx_stock_transfers_to_warehouse_id
  on public.stock_transfers (to_warehouse_id, initiated_at desc);

create index if not exists idx_stock_transfers_status
  on public.stock_transfers (status, initiated_at desc);

create index if not exists idx_stock_transfers_variant_id
  on public.stock_transfers (variant_id)
  where variant_id is not null;

alter table public.stock_transfers enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_transfers'
      and policyname = 'Stock transfers are readable by authenticated users'
  ) then
    create policy "Stock transfers are readable by authenticated users"
      on public.stock_transfers for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_transfers'
      and policyname = 'Authenticated users can manage stock transfers'
  ) then
    create policy "Authenticated users can manage stock transfers"
      on public.stock_transfers for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.stock_transfers is
  'Inter-warehouse stock movements. from_warehouse_id must differ from to_warehouse_id.';
