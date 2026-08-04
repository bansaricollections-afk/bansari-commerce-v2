// ─── Sprint 9C — Search Service ──────────────────────────────────────────────
// All search traffic goes through this file.
// MUST NOT call .textSearch() directly.
// Calls the search_products() PostgreSQL RPC exclusively.
// =============================================================================
import { createServiceRoleClient } from '@/lib/supabase/service';
import { expandSynonyms } from '@/lib/synonyms';
import type { SearchParams, SearchResult, SearchProduct, TrendingSearch, SearchLog } from '@/types/search';

const DEFAULT_PER_PAGE = 24;

// ─── searchProducts ───────────────────────────────────────────────────────────
/**
 * Calls the search_products() PostgreSQL RPC.
 * Synonym expansion happens here before the RPC call.
 * DO NOT replace this with .textSearch().
 */
export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const supabase = createServiceRoleClient();

  const rawQuery  = params.query?.trim() ?? '';
  if (!rawQuery) {
    return emptyResult(rawQuery, params);
  }

  // Expand synonyms before sending to DB
  const expandedQuery = expandSynonyms(rawQuery);

  const page    = Math.max(params.page    ?? 1, 1);
  const perPage = Math.min(params.perPage ?? DEFAULT_PER_PAGE, 100);

  const { data, error } = await supabase.rpc('search_products', {
    p_query:      expandedQuery,
    p_category:   params.category   ?? null,
    p_collection: params.collection ?? null,
    p_fabric:     params.fabric     ?? null,
    p_color:      params.color      ?? null,
    p_price_min:  params.priceMin   ?? null,
    p_price_max:  params.priceMax   ?? null,
    p_occasion:   params.occasion   ?? null,
    p_size:       params.size       ?? null,
    p_in_stock:   params.inStock    ?? null,
    p_sort:       params.sort       ?? 'relevance',
    p_page:       page,
    p_per_page:   perPage,
  });

  if (error) {
    console.error('[search.service] RPC error:', error.message);
    return emptyResult(rawQuery, params);
  }

  const rows = (data ?? []) as SearchProduct[];
  const total = rows[0]?.total_count ?? 0;

  return {
    products: rows,
    meta: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      query: rawQuery,
    },
  };
}

// ─── logSearch ────────────────────────────────────────────────────────────────
/** Fire-and-forget — logs every search attempt for analytics / trending. */
export async function logSearch(entry: SearchLog): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('search_logs').insert(entry);
  } catch {
    // Non-critical — never throw from analytics logging
  }
}

// ─── getTrendingSearches ──────────────────────────────────────────────────────
/** Returns up to 10 trending search terms from the last 7 days. */
export async function getTrendingSearches(): Promise<TrendingSearch[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('trending_searches')
    .select('query, frequency');

  if (error) {
    console.error('[search.service] trending error:', error.message);
    return [];
  }
  return (data ?? []) as TrendingSearch[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emptyResult(query: string, params: SearchParams): SearchResult {
  return {
    products: [],
    meta: {
      total: 0,
      page:  params.page    ?? 1,
      perPage: params.perPage ?? DEFAULT_PER_PAGE,
      totalPages: 0,
      query,
    },
  };
}
