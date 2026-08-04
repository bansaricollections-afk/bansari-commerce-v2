"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useCallback } from "react";
import type { SortOption } from "@/types/filter-params";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "bestseller", label: "Best Seller" },
  { value: "discount",   label: "Discount" },
];

interface ResultHeaderProps {
  total: number;
  page: number;
  perPage: number;
}

function ResultHeaderInner({ total, page, perPage }: ResultHeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const currentSort = (params.get("sort") ?? "newest") as SortOption;

  const from = Math.min((page - 1) * perPage + 1, total);
  const to   = Math.min(page * perPage, total);

  const handleSort = useCallback(
    (value: SortOption) => {
      const next = new URLSearchParams(params.toString());
      next.set("sort", value);
      next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 pt-2">
      {/* Result count */}
      <p className="text-[12px] text-slate-500" aria-live="polite" aria-atomic="true">
        {total === 0 ? (
          "No products found"
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-slate-800">{from}–{to}</span>
            {" "}of{" "}
            <span className="font-semibold text-slate-800">{total.toLocaleString("en-IN")}</span>
            {" "}products
          </>
        )}
      </p>

      {/* Sort dropdown */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="sort-select"
          className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block"
        >
          Sort
        </label>
        <div className="relative">
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSort(e.target.value as SortOption)}
            className="appearance-none border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-[11px] font-medium text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResultHeader(props: ResultHeaderProps) {
  return (
    <Suspense fallback={<div className="h-10 border-b border-slate-100" />}>
      <ResultHeaderInner {...props} />
    </Suspense>
  );
}
