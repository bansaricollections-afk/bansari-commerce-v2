-- =============================================================================
-- Sprint 9C — Full Text Search Migration
-- Applies to: public.products
-- Strategy: weighted tsvector stored column + GIN index + trigger + RPC
-- No Algolia. No Typesense. Pure PostgreSQL / Supabase FTS.
-- =============================================================================

-- ── 1. Enable pg_trgm for fuzzy matching and prefix suggestions ───────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. Add search_vector column ───────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ── 3. Backfill existing rows ─────────────────────────────────────────────────
-- Weight map:
--   A = name            (highest relevance)
--   B = category, collection
--   C = fabric, color, work, occasion (from specifications JSONB)
--   D = description     (lowest relevance)
-- SKU is handled via exact equality in the RPC — not via FTS weights.
UPDATE public.products
SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A')
  || setweight(to_tsvector('english', coalesce(category, '')), 'B')
  || setweight(to_tsvector('english', coalesce(collection, '')), 'B')
  || setweight(to_tsvector('english', coalesce(fabric, '')), 'C')
  || setweight(to_tsvector('english', coalesce(color, '')), 'C')
  || setweight(to_tsvector('english', coalesce(
       specifications->>'work', '')), 'C')
  || setweight(to_tsvector('english', coalesce(
       specifications->>'occasion', '')), 'C')
  || setweight(to_tsvector('english', coalesce(description, '')), 'D');

-- ── 4. GIN index on search_vector ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING GIN(search_vector);

-- ── 5. Trigger — keep search_vector fresh on INSERT / UPDATE ──────────────────
CREATE OR REPLACE FUNCTION public.products_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B')
    || setweight(to_tsvector('english', coalesce(NEW.collection, '')), 'B')
    || setweight(to_tsvector('english', coalesce(NEW.fabric, '')), 'C')
    || setweight(to_tsvector('english', coalesce(NEW.color, '')), 'C')
    || setweight(to_tsvector('english', coalesce(
         NEW.specifications->>'work', '')), 'C')
    || setweight(to_tsvector('english', coalesce(
         NEW.specifications->>'occasion', '')), 'C')
    || setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_vector ON public.products;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF
    name, category, collection, fabric, color, description, specifications
  ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_search_vector_update();

-- ── 6. Synonym table ──────────────────────────────────────────────────────────
-- The application layer expands synonyms before building the tsquery.
-- This table is the authoritative synonym registry.
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id          serial PRIMARY KEY,
  term        text NOT NULL UNIQUE,
  synonyms    text[] NOT NULL,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO public.search_synonyms (term, synonyms) VALUES
  ('kurti',    ARRAY['kurta']),
  ('bandhej',  ARRAY['bandhani']),
  ('gota',     ARRAY['gota', 'gota patti']),
  ('mirror',   ARRAY['mirror work']),
  ('chunni',   ARRAY['dupatta'])
ON CONFLICT (term) DO NOTHING;

-- ── 7. search_logs table (analytics + trending) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_logs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query        text NOT NULL,
  result_count int  NOT NULL DEFAULT 0,
  session_id   text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON public.search_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_query
  ON public.search_logs USING GIN (query gin_trgm_ops);

-- ── 8. search_products RPC ────────────────────────────────────────────────────
-- Called exclusively by search.service.ts — never via .textSearch() directly.
-- Supports: FTS with ts_rank_cd(), SKU exact match, all FilterParams,
--           sorting (relevance / newest / price_asc / price_desc /
--           bestseller / discount), and cursor-based pagination.
CREATE OR REPLACE FUNCTION public.search_products(
  p_query       text,
  p_category    text     DEFAULT NULL,
  p_collection  text     DEFAULT NULL,
  p_fabric      text     DEFAULT NULL,
  p_color       text     DEFAULT NULL,
  p_price_min   numeric  DEFAULT NULL,
  p_price_max   numeric  DEFAULT NULL,
  p_occasion    text     DEFAULT NULL,
  p_size        text     DEFAULT NULL,
  p_in_stock    boolean  DEFAULT NULL,
  p_sort        text     DEFAULT 'relevance',
  p_page        int      DEFAULT 1,
  p_per_page    int      DEFAULT 24
)
RETURNS TABLE (
  id             int,
  name           text,
  slug           text,
  price          numeric,
  compare_price  numeric,
  stock          int,
  active         boolean,
  images         jsonb,
  category       text,
  collection     text,
  featured       boolean,
  new_arrival    boolean,
  best_seller    boolean,
  description    text,
  sizes          text[],
  seo_title      text,
  seo_description text,
  sku            text,
  fabric         text,
  color          text,
  rating         numeric,
  review_count   int,
  specifications jsonb,
  relevance_score float4,
  total_count    bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_query      text := trim(p_query);
  v_tsquery    tsquery;
  v_offset     int  := ((GREATEST(p_page, 1) - 1) * GREATEST(p_per_page, 1));
  v_limit      int  := LEAST(GREATEST(p_per_page, 1), 100);
  v_sku_match  boolean := false;
BEGIN
  -- ── Validate / build tsquery ─────────────────────────────────────────────
  IF v_query = '' OR v_query IS NULL THEN
    RAISE EXCEPTION 'p_query must not be empty';
  END IF;

  -- Attempt SKU exact match first (case-insensitive)
  v_sku_match := EXISTS (
    SELECT 1 FROM public.products
    WHERE lower(sku) = lower(v_query)
      AND active = true
  );

  -- Build a safe tsquery; plain_to_tsquery handles multi-word input gracefully
  BEGIN
    v_tsquery := plainto_tsquery('english', v_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := to_tsquery('english', 'dummy');
  END;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.price,
      p.compare_price,
      p.stock,
      p.active,
      p.images,
      p.category,
      p.collection,
      p.featured,
      p.new_arrival,
      p.best_seller,
      p.description,
      p.sizes,
      p.seo_title,
      p.seo_description,
      p.sku,
      p.fabric,
      p.color,
      p.rating,
      p.review_count,
      p.specifications,
      -- SKU exact match gets maximum relevance score
      CASE
        WHEN lower(p.sku) = lower(v_query) THEN 1.0::float4
        ELSE ts_rank_cd(p.search_vector, v_tsquery, 32)::float4
      END AS relevance_score,
      count(*) OVER () AS total_count
    FROM public.products p
    WHERE
      p.active = true
      -- FTS match OR SKU exact match
      AND (
        (p.search_vector @@ v_tsquery)
        OR (lower(p.sku) = lower(v_query))
      )
      -- ── FilterParams ──────────────────────────────────────────────────────
      AND (p_category   IS NULL OR p.category   = p_category)
      AND (p_collection IS NULL OR p.collection = p_collection)
      AND (p_fabric     IS NULL OR p.fabric     = p_fabric)
      AND (p_color      IS NULL OR p.color      = p_color)
      AND (p_price_min  IS NULL OR p.price      >= p_price_min)
      AND (p_price_max  IS NULL OR p.price      <= p_price_max)
      AND (p_in_stock   IS NULL OR (
            CASE WHEN p_in_stock THEN p.stock > 0 ELSE true END
          ))
      AND (p_size       IS NULL OR p.sizes @> ARRAY[p_size])
      AND (p_occasion   IS NULL OR
           p.specifications->>'occasion' ILIKE '%' || p_occasion || '%')
  )
  SELECT
    r.id,
    r.name,
    r.slug,
    r.price,
    r.compare_price,
    r.stock,
    r.active,
    r.images,
    r.category,
    r.collection,
    r.featured,
    r.new_arrival,
    r.best_seller,
    r.description,
    r.sizes,
    r.seo_title,
    r.seo_description,
    r.sku,
    r.fabric,
    r.color,
    r.rating,
    r.review_count,
    r.specifications,
    r.relevance_score,
    r.total_count
  FROM ranked r
  ORDER BY
    CASE p_sort
      WHEN 'relevance'  THEN r.relevance_score END DESC NULLS LAST,
    CASE p_sort
      WHEN 'newest'     THEN null END,                           -- placeholder
    CASE p_sort
      WHEN 'price_asc'  THEN r.price END ASC  NULLS LAST,
    CASE p_sort
      WHEN 'price_desc' THEN r.price END DESC NULLS LAST,
    CASE p_sort
      WHEN 'bestseller' THEN r.best_seller::int END DESC NULLS LAST,
    CASE p_sort
      WHEN 'discount'
        THEN (coalesce(r.compare_price, r.price) - r.price) END DESC NULLS LAST,
    -- Secondary: always break ties by newest
    r.id DESC
  LIMIT  v_limit
  OFFSET v_offset;
END;
$$;

-- Grant execute to authenticated and anon roles (Supabase default roles)
GRANT EXECUTE ON FUNCTION public.search_products(
  text, text, text, text, text, numeric, numeric, text, text, boolean, text, int, int
) TO authenticated, anon;

-- ── 9. trending_searches view ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.trending_searches AS
  SELECT
    lower(trim(query)) AS query,
    count(*)            AS frequency
  FROM   public.search_logs
  WHERE  created_at   > now() - interval '7 days'
    AND  result_count > 0
    AND  length(trim(query)) >= 2
  GROUP  BY lower(trim(query))
  ORDER  BY frequency DESC
  LIMIT  10;

GRANT SELECT ON public.trending_searches TO authenticated, anon;
