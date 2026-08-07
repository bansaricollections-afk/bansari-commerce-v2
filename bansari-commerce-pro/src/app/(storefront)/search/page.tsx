// ─── Sprint 1 — Search Results Page ─────────────────────────────────────────
// Server component: reads searchParams, fetches via searchProducts + getTrendingSearches,
// renders SearchResultsGrid | ZeroResults | TrendingSection with correct props.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { searchProducts, getTrendingSearches } from '@/services/search.service';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import ZeroResults from '@/components/search/ZeroResults';
import TrendingSection from '@/components/search/TrendingSection';
import type { TrendingSearch } from '@/types/search';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; category?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  return {
    title: q ? `"${q}" — Search Results | Bansari Collection` : 'Search | Bansari Collection',
    description: q
      ? `Shop ${q} — luxury Indian ethnic fashion by Bansari Collection. Kurtas, sarees, lehengas & more.`
      : 'Search our curated collection of luxury Indian ethnic fashion.',
    robots: { index: false, follow: true },
  };
}

async function SearchResultsServer({
  q, page, sort, category, trending,
}: {
  q: string;
  page: number;
  sort: string;
  category?: string;
  trending: TrendingSearch[];
}) {
  const result = await searchProducts({
    query: q,
    page,
    perPage: 24,
    sort: sort as 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_seller',
    ...(category ? { category } : {}),
  });

  if (result.products.length === 0) {
    return <ZeroResults query={q} trending={trending} />;
  }

  return (
    <>
      <p className="mb-4 text-xs text-slate-400">
        {result.meta.total} result{result.meta.total !== 1 ? 's' : ''}
      </p>
      <SearchResultsGrid products={result.products} query={q} />
    </>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const sort = params.sort ?? 'relevance';
  const category = params.category;

  // Fetch trending in parallel (used by idle state + ZeroResults)
  const trending = await getTrendingSearches().catch((): TrendingSearch[] => []);

  // Structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: q ? `Search results for "${q}"` : 'Search',
    url: `https://bansaricollections.com/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-white">
        {/* ── Page header ── */}
        <div className="border-b border-slate-100 bg-white px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            {q ? (
              <>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Search Results</p>
                <h1 className="mt-1 font-serif text-2xl text-slate-900">&ldquo;{q}&rdquo;</h1>
              </>
            ) : (
              <>
                <h1 className="font-serif text-2xl text-slate-900">Search</h1>
                <p className="mt-1 text-sm text-slate-500">Browse our curated collection</p>
              </>
            )}
          </div>
        </div>

        {/* ── Sort bar (client-rendered to avoid full page reload) ── */}
        {q && (
          <div className="border-b border-slate-100 px-4 py-3 sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
              <span className="text-xs text-slate-400">Sort by:</span>
              {(['relevance', 'newest', 'price_asc', 'price_desc', 'best_seller'] as const).map((s) => (
                <a
                  key={s}
                  href={`/search?q=${encodeURIComponent(q)}&sort=${s}`}
                  className={`text-xs transition-colors ${
                    sort === s ? 'font-semibold text-[#8A5A6A]' : 'text-slate-500 hover:text-[#8A5A6A]'
                  }`}
                >
                  {s === 'relevance' ? 'Relevance'
                    : s === 'newest' ? 'Newest'
                    : s === 'price_asc' ? 'Price: Low → High'
                    : s === 'price_desc' ? 'Price: High → Low'
                    : 'Best Sellers'}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Results / idle ── */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          {q ? (
            <Suspense
              fallback={
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] rounded-sm bg-slate-100" />
                      <div className="mt-3 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <SearchResultsServer q={q} page={page} sort={sort} category={category} trending={trending} />
            </Suspense>
          ) : (
            <div className="py-12">
              <TrendingSection trending={trending} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
