-- Adds real page-view tracking to products, so "Best Sellers" on the
-- homepage can be driven by actual visit counts instead of fabricated
-- review/sold numbers. Additive, non-destructive: one nullable-safe
-- integer column, defaulted to 0 for existing rows.

alter table public.products
  add column if not exists view_count integer not null default 0;

create index if not exists products_view_count_idx on public.products (view_count desc);
