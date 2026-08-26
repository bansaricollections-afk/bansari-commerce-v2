-- 20260826010000_restore_missing_performance_indexes
-- --------------------------------------------------
-- Restores the indexes on `products` and `orders` that were declared in early
-- migrations but never reached production, because those migrations were among
-- the ~37 missing from the migration history table.
--
-- SELECTED, NOT RESTORED WHOLESALE
--
-- An audit of every index declared anywhere in the migration history found 306
-- of them. They fell into three groups:
--
--   PRESENT              already exist -- nothing to do
--   SAFE_TO_CREATE       missing, and every column they need exists
--   SKIP_COLUMN_MISSING  missing, and the column or table does NOT exist
--
-- That last group is why the old migrations must never simply be replayed: ~90
-- indexes reference things that do not exist in this database, including
-- orders.deleted_at, order_audit_trail.event_type, product_variants
-- .stock_current, and the whole DAM and inventory_ledger subsystems. A single
-- CREATE INDEX against a missing column aborts the entire migration, so a
-- replay would fail partway and leave the run half-applied.
--
-- Of the ~58 SAFE_TO_CREATE indexes, most were skipped here as redundant or
-- worthless rather than merely safe:
--
--   * Duplicates under a different name of an index that already exists —
--     product_variants (sku, product_id, status), purchase_orders,
--     stock_transfers, vendors, warehouses, dam_assets, dam_folders,
--     inventory_reservations. Two indexes on the same columns cost writes and
--     buy nothing.
--   * orders_razorpay_payment_id_udx / _idx — orders_razorpay_payment_id_
--     unique_idx already covers that column, and a second UNIQUE index on it
--     would be pure overhead on the payment write path.
--   * categories, collections, subcategories, tags — nine rows each. An index
--     is slower than the sequential scan it replaces at that size.
--   * admin_audit_log 3-column variants — the table was only just created and
--     is empty; the two indexes it ships with are sufficient.
--
-- What remains is the set that the storefront and admin actually query on
-- every request. Definitions are copied verbatim from the original migrations,
-- including sort direction and partial WHERE clauses, so this file and its
-- ancestors cannot disagree.
--
-- SAFETY
--
-- Additive and idempotent: every statement is `create index if not exists`,
-- so re-running changes nothing. No table, column, constraint or row is
-- touched. Index creation takes a brief lock, which on this catalogue (tens of
-- products, tens of orders) is measured in milliseconds.

-- ── products ────────────────────────────────────────────────────────────────
-- Every storefront query filters on active; the partial indexes below match
-- the exact shape of the homepage and shop queries (featured/new_arrival/
-- best_seller AND active), so they stay small and are actually usable.

create index if not exists products_active_idx
  on public.products (active);

create index if not exists products_category_idx
  on public.products (category);

create index if not exists products_created_at_idx
  on public.products (created_at desc);

create index if not exists products_stock_idx
  on public.products (stock);

create index if not exists products_featured_active_idx
  on public.products (featured, active) where active = true;

create index if not exists products_new_arrival_active_idx
  on public.products (new_arrival, active) where active = true;

create index if not exists products_best_seller_active_idx
  on public.products (best_seller, active) where active = true;

create index if not exists products_slug_active_idx
  on public.products (slug, active);

create index if not exists products_collection_active_idx
  on public.products (collection, active) where active = true;

-- Backs the admin low-stock alert list.
create index if not exists products_low_stock_idx
  on public.products (stock, active) where active = true and stock <= 5;


-- ── orders ──────────────────────────────────────────────────────────────────
-- The admin order list sorts by created_at desc and filters by status, so the
-- composite (status, created_at desc) indexes serve both the filter and the
-- sort in one scan. Single-column status indexes are deliberately omitted:
-- the composites already cover them as a leading-column prefix.

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_order_status_created_at_idx
  on public.orders (order_status, created_at desc);

create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);

-- Partial: only paid orders have paid_at, so the index stays small.
create index if not exists orders_paid_at_idx
  on public.orders (paid_at desc)
  where paid_at is not null;

-- Payment-provider lookups. Both are hit by webhook reconciliation, where a
-- sequential scan would sit in the payment path.
create index if not exists orders_payment_reference_idx
  on public.orders (payment_reference);

create index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id);
