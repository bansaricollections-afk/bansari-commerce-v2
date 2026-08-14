-- ============================================================================
-- products.is_size_managed — explicit "this product is sold by size" flag
-- ============================================================================
-- Publication safety needs to know whether a product is INTENDED to be sold
-- through size variants. That intent cannot be inferred safely:
--
--   * products.sizes[] already disagrees with the real variants on some rows
--   * "has variants" is circular — a new sized product has none yet
--   * requiring variants for everything would break genuinely non-sized items
--
-- So it becomes an explicit, admin-controlled flag.
--
--   false → legacy / non-sized product. products.stock path unchanged.
--   true  → sold by size. Cannot be published active without at least one
--           active variant carrying available stock (enforced in
--           ProductV2Service, the single write chokepoint for both the
--           create and update admin routes).
--
-- DEFAULT false, deliberately: every existing product keeps exactly its
-- current behaviour and nothing is silently converted to size-managed. The
-- nine products that already carry variants are NOT auto-flagged — the admin
-- turns the flag on per product when ready.
--
-- No data is rewritten. No stock, sizes, variant or inventory value is touched.
-- ============================================================================

alter table public.products
  add column if not exists is_size_managed boolean not null default false;

comment on column public.products.is_size_managed is
  'Explicit admin flag: true = sold through size variants (publication requires a sellable variant). false = legacy product-level stock path. Never inferred from sizes[] or variant presence.';

-- Publication guard lookups filter on this flag alongside active.
create index if not exists products_is_size_managed_idx
  on public.products (is_size_managed)
  where is_size_managed;
