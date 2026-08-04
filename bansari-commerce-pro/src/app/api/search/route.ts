// ─── Sprint 9C — Search API Route ────────────────────────────────────────────
// GET /api/search?q=...&page=1&sort=relevance&category=...&...
// Accepts same FilterParams as the shop page + required ?q= query string.
// Returns JSON matching SearchResult shape.
import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, logSearch } from '@/services/search.service';
import type { SearchParams } from '@/types/search';
import type { SortOption } from '@/types/filter-params';

const VALID_SORTS = new Set<SortOption>(
  ['relevance' as SortOption, 'newest', 'price_asc', 'price_desc', 'bestseller', 'discount']
);

function parseSort(raw: string | null): SortOption {
  return VALID_SORTS.has(raw as SortOption) ? (raw as SortOption) : 'relevance' as SortOption;
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parsePositiveFloat(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;

  const query = sp.get('q')?.trim() ?? '';
  if (!query) {
    return NextResponse.json(
      { error: 'Missing required query parameter: q' },
      { status: 400 }
    );
  }

  const params: SearchParams = {
    query,
    page:       parsePositiveInt(sp.get('page'), 1),
    perPage:    24,
    sort:       parseSort(sp.get('sort')),
    category:   sp.get('category')   ?? undefined,
    collection: sp.get('collection') ?? undefined,
    fabric:     sp.get('fabric')     ?? undefined,
    color:      sp.get('color')      ?? undefined,
    priceMin:   parsePositiveFloat(sp.get('priceMin')),
    priceMax:   parsePositiveFloat(sp.get('priceMax')),
    occasion:   sp.get('occasion')   ?? undefined,
    size:       sp.get('size')       ?? undefined,
    inStock:    sp.get('availability') === 'in_stock'    ? true
                : sp.get('availability') === 'out_of_stock' ? false
                : undefined,
  };

  const result = await searchProducts(params);

  // Fire-and-forget analytics log
  void logSearch({
    query,
    result_count: result.meta.total,
    session_id:   req.cookies.get('session_id')?.value,
  });

  return NextResponse.json(result, {
    status: 200,
    headers: {
      // Allow CDN caching for 30 s; revalidate in background
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
