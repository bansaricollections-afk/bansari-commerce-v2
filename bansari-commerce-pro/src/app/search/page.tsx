// ─── Sprint 4 Batch 5 — /search page (Suspense boundary + skeleton) ──────────
// Adds <Suspense> around SearchResultsGrid so RSC streaming shows
// ProductGridSkeleton during initial product grid render.
// No route, layout, filter, or sort logic changes.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FilterSidebar from '@/components/shop/FilterSidebar';
import MobileFilterBar from '@/components/shop/MobileFilterBar';
import ShopToolbar from '@/components/shop/ShopToolbar';
import ActiveFilters from '@/components/shop/ActiveFilters';
import Pagination from '@/components/shop/Pagination';
import ShopTrustStrip from '@/components/shop/ShopTrustStrip';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import ZeroResults from '@/components/search/ZeroResults';
import TrendingSection from '@/components/search/TrendingSection';
import SearchInput from '@/components/search/SearchInput';
import ProductGridSkeleton from '@/components/shop/ProductGridSkeleton';
import { searchProducts } from '@/services/search.service';
import { getTrendingSearches } from '@/services/search.service';
import type { FilterParams, PaginationMeta, SortOption } from '@/types/filter-params';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q  = Array.isArray(sp.q) ? sp.q[0] : (sp.q ?? '');
  return {
    title: q ? `"${q}" — Search — Bansari Collections` : 'Search — Bansari Collections',
    description: q
      ? `Shop results for "${q}" at Bansari Collections — luxury ethnic wear.`
      : 'Search our full catalogue of luxury ethnic wear.',
    robots: { index: false, follow: true },
  };
}

// ── Parse helpers (mirrors shop/page.tsx) ────────────────────────────────────
const VALID_SORTS = new Set<SortOption>(
  ['relevance' as SortOption, 'newest', 'price_asc', 'price_desc', 'bestseller', 'discount']
);

function parseSort(raw: string | undefined): SortOption {
  return VALID_SORTS.has(raw as SortOption) ? (raw as SortOption) : 'relevance' as SortOption;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parsePositiveFloat(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

type SP = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  function str(key: string): string | undefined {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  }

  const rawQuery = str('q')?.trim() ?? '';

  const filterParams: FilterParams = {
    page:       parsePositiveInt(str('page'), 1),
    perPage:    24,
    sort:       parseSort(str('sort')),
    category:   str('category'),
    collection: str('collection'),
    fabric:     str('fabric'),
    color:      str('color'),
    priceMin:   parsePositiveFloat(str('priceMin')),
    priceMax:   parsePositiveFloat(str('priceMax')),
    occasion:   str('occasion'),
    size:       str('size'),
    inStock:    str('availability') === 'in_stock' ? true
                : str('availability') === 'out_of_stock' ? false
                : undefined,
  };

  const [searchResult, trending] = await Promise.all([
    rawQuery
      ? searchProducts({ ...filterParams, query: rawQuery })
      : Promise.resolve(null),
    getTrendingSearches(),
  ]);

  const products    = searchResult?.products ?? [];
  const rawMeta     = searchResult?.meta;
  const meta: PaginationMeta | null = rawMeta
    ? {
        ...rawMeta,
        hasNextPage: rawMeta.page < rawMeta.totalPages,
        hasPrevPage: rawMeta.page > 1,
      }
    : null;
  const totalPages  = meta?.totalPages ?? 0;
  const currentPage = filterParams.page ?? 1;

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-white">
        {/* ─ Search bar hero ─ */}
        <section className="border-b border-slate-100 bg-[#faf9f7] px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A5A6A]">
              Search
            </p>
            <h1 className="mb-6 text-center font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900">
              {rawQuery ? <>"{rawQuery}"</> : 'What are you looking for?'}
            </h1>
            <SearchInput defaultValue={rawQuery} />
          </div>
        </section>

        {/* ─ No query: show trending ─ */}
        {!rawQuery && (
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <TrendingSection trending={trending} />
          </div>
        )}

        {/* ─ Results layout ─ */}
        {rawQuery && (
          <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
            <MobileFilterBar filterParams={filterParams} />

            <div className="flex gap-8">
              <aside className="hidden w-56 shrink-0 lg:block" aria-label="Filters">
                <FilterSidebar />
              </aside>

              <div className="min-w-0 flex-1">
                <ShopToolbar
                  total={meta?.total ?? 0}
                  filterParams={filterParams}
                />

                <ActiveFilters />

                {meta && meta.total > 0 && (
                  <p className="mb-6 text-xs text-slate-500">
                    {meta.total.toLocaleString()} result{meta.total !== 1 ? 's' : ''}
                    {' '}for "{rawQuery}"
                  </p>
                )}

                {/* ── Suspense boundary: skeleton while grid streams in ── */}
                <Suspense fallback={<ProductGridSkeleton />}>
                  {products.length > 0 ? (
                    <SearchResultsGrid products={products} query={rawQuery} />
                  ) : (
                    <ZeroResults query={rawQuery} trending={trending} />
                  )}
                </Suspense>

                {totalPages > 1 && meta && (
                  <div className="mt-12">
                    <Pagination meta={meta} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <ShopTrustStrip />
      <Footer />
    </>
  );
}
