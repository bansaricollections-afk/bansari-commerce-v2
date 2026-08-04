/**
 * FilterParams — Sprint 9A (updated 9C: +relevance sort)
 *
 * Single source of truth for every product-discovery consumer:
 * ProductGrid (RSC), getFilteredProducts (service), FilterSidebar (Sprint 9B),
 * ShopToolbar (URL sort), and the Sprint 9C search_products RPC route.
 *
 * All fields are optional so callers can pass only what they need.
 * String fields match DB column values exactly (case-sensitive).
 */

export type SortOption =
  | 'relevance'   // ts_rank_cd DESC (search page default — Sprint 9C)
  | 'newest'      // created_at DESC  (shop page default)
  | 'price_asc'   // price ASC
  | 'price_desc'  // price DESC
  | 'bestseller'  // best_seller DESC, created_at DESC
  | 'discount';   // computed discount DESC (compare_price - price)

export interface FilterParams {
  // ── Pagination ─────────────────────────────────────────────────────────
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Results per page. Defaults to 24. */
  perPage?: number;

  // ── Sorting ────────────────────────────────────────────────────────────
  sort?: SortOption;

  // ── Category / Collection ──────────────────────────────────────────────────
  /** Matches products.category column exactly. */
  category?: string;
  /** Matches products.collection column exactly. */
  collection?: string;

  // ── Attribute filters ────────────────────────────────────────────────────
  /** Matches products.fabric column exactly. */
  fabric?: string;
  /** Matches products.color column exactly. */
  color?: string;

  // ── Price range ──────────────────────────────────────────────────────────
  /** Inclusive minimum price (products.price >= priceMin). */
  priceMin?: number;
  /** Inclusive maximum price (products.price <= priceMax). */
  priceMax?: number;

  // ── Occasion (stored in specifications JSONB) ───────────────────────────────
  /**
   * Matches specifications->>'occasion' (case-insensitive contains).
   * Stored as free-text in the JSONB specifications column.
   */
  occasion?: string;

  // ── Size ─────────────────────────────────────────────────────────────────
  /**
   * Matches products.sizes array contains the given value.
   * Uses Supabase .contains() / PostgreSQL @> operator.
   */
  size?: string;

  // ── Stock / Availability ───────────────────────────────────────────────────
  /**
   * When true, restricts to products.stock > 0.
   * When false or omitted, all active products are returned.
   */
  inStock?: boolean;
}

/** Derived pagination metadata returned alongside product results. */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
