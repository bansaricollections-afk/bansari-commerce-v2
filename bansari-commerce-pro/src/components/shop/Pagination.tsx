"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const TOTAL_PAGES = 8;
const PER_PAGE = 24;
const TOTAL_PRODUCTS = 192;

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function Pagination() {
  const [page, setPage] = useState(1);
  const pages = getPageRange(page, TOTAL_PAGES);

  const from = (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, TOTAL_PRODUCTS);
  const progressPct = (page / TOTAL_PAGES) * 100;

  function handleSetPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-16 border-t border-slate-200 pt-10"
    >
      {/* Progress bar */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="h-px w-48 bg-slate-100"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Page ${page} of ${TOTAL_PAGES}`}
        >
          <div
            className="h-full bg-[#8A5A6A] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
          {from}–{to} of {TOTAL_PRODUCTS} products
        </p>
      </div>

      {/* Page buttons */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        {/* Prev */}
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => handleSetPage(Math.max(1, page - 1))}
          className="flex items-center gap-2 border border-slate-200 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <ChevronLeft size={13} aria-hidden="true" />
          Previous
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-9 w-9 items-center justify-center text-[11px] text-slate-300"
                aria-hidden="true"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={page === p ? "page" : undefined}
                onClick={() => handleSetPage(p as number)}
                className={[
                  "flex h-9 w-9 items-center justify-center border text-[11px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
                  page === p
                    ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                ].join(" ")}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          type="button"
          aria-label="Next page"
          disabled={page === TOTAL_PAGES}
          onClick={() => handleSetPage(Math.min(TOTAL_PAGES, page + 1))}
          className="flex items-center gap-2 border border-slate-200 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          Next
          <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
