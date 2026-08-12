"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import type { FilterParams, SortOption } from "@/types/filter-params";
import { EMPTY_SHOP_FACETS, type ShopFacets } from "./FilterSidebar";

interface Props {
  filterParams?: FilterParams;
  /** Live catalog facets — identical source to the desktop sidebar, so the
   *  two can never diverge (mobile must never show a filter desktop hides). */
  facets?: ShopFacets;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "bestseller", label: "Best Seller" },
  { value: "discount",   label: "Discount" },
];

const AVAILABILITY_OPTIONS = [
  { label: "In Stock",     value: "in_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "New Arrival",  value: "new_arrival" },
];

type DraftFilters = {
  category:     string;
  collection:   string;
  occasion:     string;
  fabric:       string;
  size:         string;
  color:        string;
  availability: string;
  priceMin:     string;
  priceMax:     string;
  sort:         SortOption;
};

function MobileFilterBarInner({ facets }: { facets: ShopFacets }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();
  const [open, setOpen] = useState(false);

  // Draft mirrors URL on open
  const [draft, setDraft] = useState<DraftFilters>({
    category:     "",
    collection:   "",
    occasion:     "",
    fabric:       "",
    size:         "",
    color:        "",
    availability: "",
    priceMin:     "",
    priceMax:     "",
    sort:         "newest",
  });

  // Sync draft from URL whenever drawer opens
  useEffect(() => {
    if (!open) return;
    setDraft({
      category:     params.get("category")     ?? "",
      collection:   params.get("collection")   ?? "",
      occasion:     params.get("occasion")     ?? "",
      fabric:       params.get("fabric")       ?? "",
      size:         params.get("size")         ?? "",
      color:        params.get("color")        ?? "",
      availability: params.get("availability") ?? "",
      priceMin:     params.get("priceMin")     ?? "",
      priceMax:     params.get("priceMax")     ?? "",
      sort:         (params.get("sort") ?? "newest") as SortOption,
    });
  }, [open, params]);

  // Scroll-lock while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const applyFilters = useCallback(() => {
    const next = new URLSearchParams();
    if (draft.category)     next.set("category",     draft.category);
    if (draft.collection)   next.set("collection",   draft.collection);
    if (draft.occasion)     next.set("occasion",     draft.occasion);
    if (draft.fabric)       next.set("fabric",       draft.fabric);
    if (draft.size)         next.set("size",         draft.size);
    if (draft.color)        next.set("color",        draft.color);
    if (draft.availability) next.set("availability", draft.availability);
    if (draft.priceMin)     next.set("priceMin",     draft.priceMin);
    if (draft.priceMax)     next.set("priceMax",     draft.priceMax);
    next.set("sort", draft.sort);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    setOpen(false);
  }, [draft, pathname, router]);

  const clearDraft = useCallback(() => {
    setDraft({ category: "", collection: "", occasion: "", fabric: "", size: "", color: "", availability: "", priceMin: "", priceMax: "", sort: "newest" });
  }, []);

  const activeCount = [draft.category, draft.collection, draft.occasion, draft.fabric, draft.size, draft.color, draft.availability, draft.priceMin, draft.priceMax].filter(Boolean).length;

  return (
    <>
      {/* ── Floating trigger bar (mobile only) ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white px-4 py-3 lg:hidden" role="toolbar" aria-label="Filter and sort controls">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-filter-drawer"
            className="flex flex-1 items-center justify-center gap-2 border border-slate-200 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:border-[#8A5A6A] hover:text-[#8A5A6A] focus-visible:outline-none"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8A5A6A] px-1.5 text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {/* Inline sort — visible at all times on mobile */}
          <div className="relative shrink-0">
            <select
              value={params.get("sort") ?? "newest"}
              onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                next.set("sort", e.target.value);
                next.set("page", "1");
                router.replace(`${pathname}?${next.toString()}`, { scroll: false });
              }}
              className="appearance-none border border-slate-200 bg-white py-2.5 pl-3 pr-7 text-[11px] font-medium text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown size={12} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Bottom sheet drawer ───────────────────────────────────────────── */}
      <div
        id="mobile-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Product filters"
        className={[
          "fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900">Filters</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8A5A6A] px-1.5 text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-4">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A] focus-visible:outline-none"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="flex h-8 w-8 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-5">

          {/* Sort */}
          <div className="border-b border-slate-100 py-4">
            <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={draft.sort === o.value}
                  onClick={() => setDraft((d) => ({ ...d, sort: o.value }))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
                    draft.sort === o.value
                      ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-400",
                  ].join(" ")}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category — exact stored products.category values */}
          {facets.categories.length > 0 && (
          <FilterSection title="Category">
            <div className="flex flex-wrap gap-2">
              {facets.categories.map((c) => (
                <Pill
                  key={c} label={c}
                  active={draft.category === c}
                  onClick={() => setDraft((d) => ({ ...d, category: d.category === c ? "" : c }))}
                />
              ))}
            </div>
          </FilterSection>
          )}

          {/* Collection — exact stored products.collection values.
              Previously absent on mobile entirely, so mobile and desktop
              offered different taxonomy. */}
          {facets.collections.length > 0 && (
          <FilterSection title="Collection">
            <div className="flex flex-wrap gap-2">
              {facets.collections.map((c) => (
                <Pill
                  key={c} label={c}
                  active={draft.collection === c}
                  onClick={() => setDraft((d) => ({ ...d, collection: d.collection === c ? "" : c }))}
                />
              ))}
            </div>
          </FilterSection>
          )}

          {facets.occasions.length > 0 && (
          <FilterSection title="Occasion">
            <div className="flex flex-wrap gap-2">
              {facets.occasions.map((o) => (
                <Pill
                  key={o} label={o}
                  active={draft.occasion === o}
                  onClick={() => setDraft((d) => ({ ...d, occasion: d.occasion === o ? "" : o }))}
                />
              ))}
            </div>
          </FilterSection>
          )}

          {facets.fabrics.length > 0 && (
          <FilterSection title="Fabric">
            <div className="flex flex-wrap gap-2">
              {facets.fabrics.map((f) => (
                <Pill
                  key={f} label={f}
                  active={draft.fabric === f}
                  onClick={() => setDraft((d) => ({ ...d, fabric: d.fabric === f ? "" : f }))}
                />
              ))}
            </div>
          </FilterSection>
          )}

          {facets.sizes.length > 0 && (
          <FilterSection title="Size">
            <div className="flex flex-wrap gap-1.5">
              {facets.sizes.map((s) => (
                <button
                  key={s} type="button"
                  aria-pressed={draft.size === s}
                  onClick={() => setDraft((d) => ({ ...d, size: d.size === s ? "" : s }))}
                  className={[
                    "flex h-10 min-w-[44px] items-center justify-center border px-2 text-[12px] font-semibold transition-all",
                    draft.size === s
                      ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                      : "border-slate-200 bg-white text-slate-600",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterSection>
          )}

          {/* Colour — exact stored products.color values. The previous
              swatches navigated with hex codes that never matched the stored
              colour names, so every swatch returned zero products. */}
          {facets.colors.length > 0 && (
          <FilterSection title="Colour">
            <div className="flex flex-wrap gap-2">
              {facets.colors.map((c) => (
                <Pill
                  key={c} label={c.toLowerCase()}
                  active={draft.color === c}
                  onClick={() => setDraft((d) => ({ ...d, color: d.color === c ? "" : c }))}
                />
              ))}
            </div>
          </FilterSection>
          )}

          {/* Price */}
          <FilterSection title="Price Range (₹)">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Min</label>
                <input
                  type="number" placeholder="499"
                  value={draft.priceMin}
                  onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 text-[12px] focus:border-[#8A5A6A] focus:outline-none"
                  aria-label="Minimum price"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Max</label>
                <input
                  type="number" placeholder="29999"
                  value={draft.priceMax}
                  onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 text-[12px] focus:border-[#8A5A6A] focus:outline-none"
                  aria-label="Maximum price"
                />
              </div>
            </div>
          </FilterSection>

          {/* Availability */}
          <FilterSection title="Availability">
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(({ label, value }) => (
                <Pill
                  key={value} label={label}
                  active={draft.availability === value}
                  onClick={() => setDraft((d) => ({ ...d, availability: d.availability === value ? "" : value }))}
                />
              ))}
            </div>
          </FilterSection>

          {/* Bottom padding so content isn't hidden by the sticky footer */}
          <div className="h-6" />
        </div>

        {/* Sticky apply footer */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={applyFilters}
            className="w-full bg-[#8A5A6A] py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#7a4a5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Tiny shared sub-components used inside the drawer ───────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-4">
      <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700">{title}</p>
      {children}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
        active
          ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
          : "border-slate-200 text-slate-600 hover:border-slate-400",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function MobileFilterBar({ filterParams, facets = EMPTY_SHOP_FACETS }: Props) {
  return (
    <Suspense fallback={null}>
      <MobileFilterBarInner facets={facets} />
    </Suspense>
  );
}
