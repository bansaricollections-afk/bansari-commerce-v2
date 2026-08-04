// ─── Sprint 9C — TrendingSection ───────────────────────────────────────────────
// Shown on the empty search landing state (no query entered yet).
import type { TrendingSearch } from '@/types/search';

interface Props {
  trending: TrendingSearch[];
}

export default function TrendingSection({ trending }: Props) {
  if (trending.length === 0) return null;

  return (
    <section className="py-16 text-center" aria-label="Trending searches">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Trending searches
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {trending.map((t) => (
          <a
            key={t.query}
            href={`/search?q=${encodeURIComponent(t.query)}`}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm
                       text-slate-700 transition-colors duration-150
                       hover:border-[#8A5A6A] hover:bg-[#8A5A6A]/5 hover:text-[#8A5A6A]
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1"
          >
            {t.query}
          </a>
        ))}
      </div>
    </section>
  );
}
