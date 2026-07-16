"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const TOTAL_PAGES = 8;

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function Pagination() {
  const [page, setPage] = useState(1);
  const pages = getPageRange(page, TOTAL_PAGES);

  return (
    <nav
      aria-label="Pagination"
      className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row"
    >
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {(page - 1) * 24 + 1}–{Math.min(page * 24, 192)}
        </span>{" "}
        of <span className="font-semibold text-slate-900">192</span> products
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-slate-400">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={page === p ? "page" : undefined}
              onClick={() => setPage(p as number)}
              className={`h-9 w-9 border text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] ${
                page === p
                  ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page === TOTAL_PAGES}
          onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
          className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
