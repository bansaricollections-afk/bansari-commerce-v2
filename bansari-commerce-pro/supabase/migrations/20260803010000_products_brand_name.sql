-- ============================================================
-- 20260803010000_products_brand_name.sql
--
-- Adds brand_name column to public.products.
--
-- Context:
--   Product V2 service (product-v2.service.ts) SELECTs and INSERTs
--   brand_name as a distinct field from the legacy `brand` column.
--   The column was absent from the table, causing:
--     "Could not find the 'brand_name' column of 'products'
--      in the schema cache"
--
-- The canonical V2 field is brand_name.
-- The legacy brand column is preserved unchanged.
--
-- Idempotent: safe to run on a database that already has brand_name.
-- ============================================================

-- 1. Add the column
alter table public.products
  add column if not exists brand_name text;

-- 2. Backfill from the existing brand column for all existing rows
update public.products
set    brand_name = brand
where  brand_name is null
  and  brand is not null;

-- 3. Index for admin product search / filtering by brand
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename  = 'products'
      and indexname  = 'products_brand_name_idx'
  ) then
    create index products_brand_name_idx on public.products (brand_name);
  end if;
end $$;

-- 4. Notify PostgREST to reload schema cache immediately
select pg_notify('pgrst', 'reload schema');
