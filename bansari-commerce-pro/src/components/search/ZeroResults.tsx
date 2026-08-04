// ─── Sprint 9C — ZeroResults ─────────────────────────────────────────────────
// Shown when search returns 0 results.
// Offers navigation to the shop page and trending alternatives.
import type { TrendingSearch } from '@/types/search';

interface Props {
  query: string;
  trending: TrendingSearch[];
}

export default function ZeroResults({ query, trending }: Props) {
  return (
    <div
      className="flex min-h-[520px] flex-col items-center justify-center p-12 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center border border-slate-100 bg-slate-50">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-slate-300" aria-hidden="true">
          <circle cx="21" cy="21" r="13" stroke="currentColor" strokeWidth="1.5" />
          <line x1="31" y1="31" x2="43" y2="43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="17" y1="21" x2="25" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="21" y1="17" x2="21" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A5A6A]">
        No results
      </p>
      <h2 className="font-[family:var(--font-playfair)] text-2xl font-normal text-slate-900">
        Nothing found for “{query}”
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
        We couldn’t find any products matching your search. Try a different keyword or browse our full collection.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <a
          href="/shop"
          className="inline-flex items-center gap-2 border border-[#8A5A6A] px-6 py-3
                     text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A5A6A]
                     transition-all duration-200 hover:bg-[#8A5A6A] hover:text-white
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
        >
          View all products
        </a>
      </div>

      {trending.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Trending now
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {trending.slice(0, 6).map((t) => (
              <a
                key={t.query}
                href={`/search?q=${encodeURIComponent(t.query)}`}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs
                           text-slate-600 transition-colors hover:border-[#8A5A6A] hover:text-[#8A5A6A]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
              >
                {t.query}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
