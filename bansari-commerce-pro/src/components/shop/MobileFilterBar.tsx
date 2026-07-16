"use client";

import { useState } from "react";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import FilterSidebar from "@/components/shop/FilterSidebar";

export default function MobileFilterBar() {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <>
      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white lg:hidden"
        aria-label="Filter and sort controls"
      >
        <button
          type="button"
          aria-label="Open filters"
          onClick={() => setFilterOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter
        </button>

        <div className="w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          aria-label="Sort products"
          className="flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <ArrowUpDown size={16} aria-hidden="true" />
          Sort
        </button>
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setFilterOpen(false)}
          />

          {/* Panel — slides from left */}
          <div className="relative flex w-[85vw] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-sm font-semibold text-slate-900">Filters</span>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-900 focus-visible:outline-none"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FilterSidebar />
            </div>
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="w-full bg-[#8A5A6A] py-3 text-sm font-medium text-white transition hover:bg-[#7a4d5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
              >
                View results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
