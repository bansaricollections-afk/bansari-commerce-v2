'use client';
// ─── Sprint 4 Batch 4 — InstantSearchOverlay (mobile bottom sheet) ──────
// Desktop (sm+): existing top-panel is UNCHANGED.
// Mobile (<sm):  a bottom sheet slides up from the viewport bottom.
// Implementation:
//   • Same useSearch() call — single hook instance
//   • Same rendering tree — no JSX duplication
//   • Presentation toggled by Tailwind sm: responsive classes only
//   • Drag-handle indicator on mobile only
//   • Scroll area limited to 90dvh on mobile to respect safe areas
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSearch, highlightMatch } from '@/hooks/useSearch';
import type { SearchProduct } from '@/types/search';
import type { NavEntry } from '@/components/layout/HeaderClient';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Live catalog categories — identical array to the header mega-menu. */
  categories: NavEntry[];
  /** Live catalog collections — identical array to the header mega-menu. */
  collections: NavEntry[];
}

// Taxonomy shown in the overlay is passed in from the server-derived catalog
// (see Header.tsx → HeaderClient → HeaderSearchInput). It is never hardcoded
// here: this file previously shipped "Women's Co-Ord Sets" long after that
// category stopped having any active products, sending customers to an empty
// filter. Fabric and Occasion rows stay out — those vary per product and the
// Shop sidebar derives them from the same catalog source.

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPrice(p: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
  return (
    <span>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark key={i} className="bg-transparent font-semibold text-[#8A5A6A]">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

function ProductCard({ product, query, onClick }: { product: SearchProduct; query: string; onClick: () => void }) {
  const img = product.images?.[0]?.url;
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discount = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors hover:bg-[#8A5A6A]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]/40"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-slate-100">
        {img ? (
          <Image src={img} alt={product.name} fill className="object-cover" sizes="56px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-800">
          <HighlightedText text={product.name} query={query} />
        </p>
        {product.category && (
          <p className="mt-0.5 truncate text-xs text-slate-400">{product.category}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium text-[#8A5A6A]">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <>
              <span className="text-xs text-slate-400 line-through">{formatPrice(product.compare_price!)}</span>
              <span className="rounded-sm bg-green-50 px-1 py-0.5 text-[10px] font-semibold text-green-700">
                {discount}% off
              </span>
            </>
          )}
        </div>
      </div>
      <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function PillRow({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavEntry[];
  onNavigate: (url: string) => void;
}) {
  return (
    <div className="px-4 pb-3 sm:px-6">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.href}
            type="button"
            /* item.href is the same /shop?category= | ?collection= link the
               header renders, so an overlay chip and a nav link can never
               point at different destinations. */
            onClick={() => onNavigate(item.href)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600
                       transition-colors hover:border-[#8A5A6A] hover:text-[#8A5A6A]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]/40"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InstantSearchOverlay({ open, onClose, categories, collections }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  /* Focus-management refs only — no search query, result or navigation state.
     Two panels are rendered (desktop sm+ and mobile <sm); exactly one is
     displayed at any breakpoint, so the handler picks whichever is visible. */
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef  = useRef<HTMLDivElement>(null);

  // Single hook instance — state shared between desktop and mobile views
  const {
    query,
    setQuery,
    suggestions,
    instantResults,
    loading,
    recent,
    openIdle,
    recordSearch,
    removeRecent,
  } = useSearch({ debounceMs: 250, instantResultsCount: 6 });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      openIdle();
    }
  }, [open, openIdle]);

  /**
   * Tab containment + focus restoration, matching the MobileFilterBar pattern.
   * The overlay already moved focus to the search input on open and already
   * handled Escape; what it lacked was containment (Tab escaped to the page
   * behind it) and returning focus to the search trigger on close. The overlay
   * unmounts entirely when closed (`if (!open) return null` above), so no
   * inert/aria-hidden handling is required. DOM focus only — no search, query,
   * result, recent-search or navigation logic is touched.
   */
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // offsetParent is null for a display:none panel, so this resolves to the
      // panel actually visible at the current breakpoint.
      const panel = [desktopPanelRef.current, mobilePanelRef.current].find(
        (el) => el && el.offsetParent !== null
      );
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const navigate = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      recordSearch(trimmed);
      onClose();
      router.push(q.startsWith('/') ? q : `/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router, onClose, recordSearch],
  );

  const navigateUrl = useCallback(
    (url: string) => {
      onClose();
      router.push(url);
    },
    [router, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); navigate(query); }
    },
    [navigate, query],
  );

  if (!open) return null;

  const hasQuery   = query.trim().length >= 1;
  const hasResults = (instantResults?.products?.length ?? 0) > 0;
  const hasRecent  = recent.length > 0;
  const trendingSugg = suggestions.filter((s) => s.type === 'trending' || s.type === 'popular');
  const recentSugg   = suggestions.filter((s) => s.type === 'recent');
  const showNoResult = hasQuery && !loading && !hasResults;

  // ── Shared inner content (used by BOTH desktop panel and mobile sheet) ────
  // No duplication: rendered once, presentation driven by parent container classes.
  const panelContent = (
    <>
      {/* Input bar */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search kurta sets, co-ord sets…"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#8A5A6A]/30 border-t-[#8A5A6A]" aria-label="Loading" />
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {!hasQuery && (
          <>
            <div className="grid gap-0 sm:grid-cols-2">
              {hasRecent && (
                <div className="px-4 py-4 sm:px-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Recent</p>
                    <button
                      type="button"
                      onClick={() => { import('@/hooks/useSearch').then(m => m.clearRecent()); openIdle(); }}
                      className="text-[11px] text-slate-400 underline-offset-2 hover:text-[#8A5A6A] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {recentSugg.map((s) => (
                      <li key={s.query} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(s.query)}
                          className="flex flex-1 items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {s.query}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecent(s.query)}
                          aria-label={`Remove ${s.query}`}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {trendingSugg.length > 0 && (
                <div className="px-4 py-4 sm:px-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Trending</p>
                  <ul className="space-y-0.5">
                    {trendingSugg.map((s) => (
                      <li key={s.query}>
                        <button
                          type="button"
                          onClick={() => navigate(s.query)}
                          className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          {s.query}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!hasRecent && trendingSugg.length === 0 && (
                <div className="col-span-2 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400">Start typing to search our collection</p>
                  <p className="mt-1 text-xs text-slate-300">{categories.map((c) => c.label).join(' · ')}</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              {categories.length > 0 && (
                <PillRow label="Shop by Category"   items={categories}  onNavigate={navigateUrl} />
              )}
              {collections.length > 0 && (
                <PillRow label="Shop by Collection" items={collections} onNavigate={navigateUrl} />
              )}
            </div>
          </>
        )}

        {hasQuery && (
          <div className="grid gap-0 sm:grid-cols-[1fr_2fr]">
            {suggestions.length > 0 && (
              <div className="border-b border-slate-100 px-4 py-4 sm:border-b-0 sm:border-r sm:px-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Suggestions</p>
                <ul className="space-y-0.5">
                  {suggestions.slice(0, 6).map((s) => (
                    <li key={s.query}>
                      <button
                        type="button"
                        onClick={() => navigate(s.query)}
                        className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <HighlightedText text={s.query} query={query} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate(query)}
                  className="mt-3 flex w-full items-center gap-2 rounded-sm border border-[#8A5A6A]/30 px-3 py-2 text-sm font-medium text-[#8A5A6A] transition-colors hover:bg-[#8A5A6A]/5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Search &ldquo;{query}&rdquo;
                </button>
              </div>
            )}
            <div className="px-4 py-4 sm:px-6">
              {loading && (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3">
                      <div className="h-14 w-14 rounded-sm bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && hasResults && (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Products</p>
                  <ul className="space-y-0.5">
                    {instantResults!.products.map((p) => (
                      <li key={p.id}>
                        <ProductCard
                          product={p}
                          query={query}
                          onClick={() => { recordSearch(query); onClose(); router.push(`/shop/${p.slug}`); }}
                        />
                      </li>
                    ))}
                  </ul>
                  {instantResults!.total > 6 && (
                    <button
                      type="button"
                      onClick={() => navigate(query)}
                      className="mt-3 w-full rounded-sm bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#8A5A6A] transition-colors hover:bg-[#8A5A6A]/5"
                    >
                      See all {instantResults!.total} results for &ldquo;{query}&rdquo;
                    </button>
                  )}
                </>
              )}
              {showNoResult && (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">No results for &ldquo;{query}&rdquo;</p>
                  <p className="mt-1 text-xs text-slate-400">Try a different spelling or browse our collections</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {categories.map(({ label: cat }) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => navigate(cat)}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-[#8A5A6A] hover:text-[#8A5A6A]"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard hint — desktop only */}
      <div className="hidden items-center justify-end gap-4 border-t border-slate-100 px-6 py-2 text-[11px] text-slate-400 sm:flex">
        <span><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> to search</span>
        <span><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to close</span>
      </div>
    </>
  );

  return (
    <>
      {/* Backdrop — same for desktop and mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Desktop: top panel (sm+) ─────────────────────────────────────── */}
      <div
        ref={desktopPanelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="
          fixed left-0 right-0 top-0 z-50
          hidden flex-col bg-white shadow-2xl
          sm:flex sm:max-h-[90dvh]
        "
      >
        {panelContent}
      </div>

      {/* ── Mobile: bottom sheet (<sm) ───────────────────────────────────────
           Slide-up presentation — same panelContent, different container.
           Uses CSS translate so we get the native spring feel.
        */}
      <div
        ref={mobilePanelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="
          fixed bottom-0 left-0 right-0 z-50
          flex flex-col bg-white shadow-2xl
          rounded-t-2xl
          max-h-[90dvh]
          sm:hidden
          animate-slide-up
        "
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle — mobile affordance */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        </div>
        {panelContent}
      </div>
    </>
  );
}
