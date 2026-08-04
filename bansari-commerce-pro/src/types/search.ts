// ─── Sprint 9C — Search-specific TypeScript types ────────────────────────────
import type { FilterParams } from './filter-params';

/** Shape returned by the search_products RPC (one row per product). */
export interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  stock: number;
  active: boolean;
  images: { url: string; alt?: string }[] | null;
  category: string | null;
  collection: string | null;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  description: string | null;
  sizes: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  sku: string | null;
  fabric: string | null;
  color: string | null;
  rating: number | null;
  review_count: number | null;
  specifications: Record<string, string> | null;
  relevance_score: number;
  total_count: number;
}

/** Parameters accepted by searchProducts(). Extends FilterParams with query. */
export interface SearchParams extends FilterParams {
  query: string;
}

/** Paginated result from searchProducts(). */
export interface SearchResult {
  products: SearchProduct[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    query: string;
  };
}

/** Single trending search term from the trending_searches view. */
export interface TrendingSearch {
  query: string;
  frequency: number;
}

/** Shape of a search_logs row for analytics inserts. */
export interface SearchLog {
  query: string;
  result_count: number;
  session_id?: string;
}
