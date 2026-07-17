"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import FilterSidebar from "@/components/shop/FilterSidebar";

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "bestseller", label: "Best Selling" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Highest Rated" },
  { value: "featured",   label: "Featured" },
  { value: "az",         label: "A → Z" },
];

export default function MobileFilterBar() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    document.body.style.overflow = filterOpen || sortOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, sortOpen]);

  const selectedLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <>
      {/* ─── Sticky bottom bar ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t border-slate-200 bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.06)] lg:hidden"
        aria-label="Filter and sort controls"
      >
        <button
          type="button"
          aria-label="Open filters"
          onClick={() => setFilterOpen(true)}
          className="flex flex-1 items-center justify-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors duration-200 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filter
        </button>

        <div className="w-px bg-slate-100" aria-hidden="true" />

        <button
          type="button"
          aria-label="Sort products"
          onClick={() => setSortOpen(true)}
          className="flex flex-1 items-center justify-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors duration-200 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          Sort
        </button>
      </div>

      {/* ─── Filter drawer ─── */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Product filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => setFilterOpen(false)}
          />
          <div className="relative flex w-[88vw] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-900">Filters</span>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-900 focus-visible:outline-none"
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <FilterSidebar />
            </div>
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="w-full bg-slate-900 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sort drawer (bottom sheet) ─── */}
      {sortOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sort options"
        >
          <button
            type="button"
            aria-label="Close sort"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => setSortOpen(false)}
          />
          <div className="relative w-full rounded-t-xl bg-white shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-900">Sort By</span>
              <button
                type="button"
                aria-label="Close sort"
                onClick={() => setSortOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-900 focus-visible:outline-none"
              >
                <X size={17} />
              </button>
            </div>
            <ul role="listbox" aria-label="Sort options">
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sort === opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={[
                      "flex w-full items-center justify-between px-5 py-4 text-[12px] transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none",
                      sort === opt.value ? "font-bold text-[#8A5A6A]" : "font-medium text-slate-700",
                    ].join(" ")}
                  >
                    {opt.label}
                    {sort === opt.value && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                        <path d="M1 5l3.5 4 6.5-8" stroke="#8A5A6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 p-4 pb-8">
              <button
                type="button"
                onClick={() => setSortOpen(false)}
                className="w-full border border-slate-200 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}