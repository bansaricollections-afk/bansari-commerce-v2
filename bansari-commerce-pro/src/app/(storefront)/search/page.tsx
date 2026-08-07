// ─── Sprint 1 — Search Results Page ─────────────────────────────────────────
// Server component: reads searchParams, fetches via searchProducts service,
// renders SearchResultsGrid + ZeroResults. SEO metadata + structured data.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { searchProducts } from '@/services/search.service';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import ZeroResults from '@/components/search/ZeroResults';
import TrendingSection from '@/components/search/TrendingSection';

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

async function SearchResultsServer({ q, page, sort, category }: { q: string; page: number; sort: string; category?: string }) {
  const result = await searchProducts({
    query: q,
    page,
    perPage: 24,
    sortBy: (sort as 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_seller') ?? 'relevance',
    ...(category ? { category } : {}),
  });

  if (result.products.length === 0) {
    return <ZeroResults query={q} />;
  }

  return (
    <SearchResultsGrid
      initialProducts={result.products}
      initialMeta={result.meta}
      query={q}
    />
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const sort = params.sort ?? 'relevance';
  const category = params.category;

  // Structured data for search action
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

        {/* ── Results ── */}
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
              <SearchResultsServer q={q} page={page} sort={sort} category={category} />
            </Suspense>
          ) : (
            <div className="py-12">
              <TrendingSection />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
