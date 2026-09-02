"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@/types/filter-params";

// ─── Props ───────────────────────────────────────────────────────────────────
// Pagination is driven entirely by real data from PaginationMeta (returned by
// getFilteredProducts). All hardcoded constants have been removed.
//
// EVERY PAGE CONTROL IS AN ANCHOR.
//
// These used to be <button onClick={router.push(...)}>. That works for a person
// with JavaScript and is invisible to everything else: a crawler following
// links found no route past page 1, so 12 of the catalogue's products were
// reachable only through a filter or the sitemap. Anchors also restore
// middle-click, open-in-new-tab and "copy link address", which buttons silently
// swallow.
//
// next/link still navigates client-side, so the browsing experience is
// unchanged — the difference is that the href now exists in the HTML.

interface PaginationProps {
  meta: PaginationMeta;
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/** Shared so the active page, the inactive pages and the arrows cannot drift. */
const PAGE_BASE =
  "flex h-9 w-9 items-center justify-center border text-[11px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]";
const ARROW_BASE =
  "flex items-center gap-2 border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]";
const ARROW_ENABLED =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900";
/* Rendered as a <span>, not a disabled link: there is no page to point at. */
const ARROW_DISABLED =
  "border-slate-200 bg-white text-slate-600 cursor-not-allowed opacity-30";

export default function Pagination({ meta }: PaginationProps) {
  const searchParams = useSearchParams();

  const { page, perPage, total, totalPages } = meta;
  const pages      = getPageRange(page, totalPages);
  const from       = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to         = Math.min(page * perPage, total);
  const progressPct = totalPages > 1 ? (page / totalPages) * 100 : 100;

  // Hide the component entirely when there is only one page
  if (totalPages <= 1 && total > 0) return null;

  /** Preserves every active filter — only `page` changes. */
  function hrefForPage(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `/shop?${params.toString()}`;
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
          aria-label={`Page ${page} of ${totalPages}`}
        >
          <div
            className="h-full bg-[#8A5A6A] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
          {from}&ndash;{to} of {total} products
        </p>
      </div>

      {/* Page links */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        {/* Prev */}
        {meta.hasPrevPage ? (
          <Link
            href={hrefForPage(Math.max(1, page - 1))}
            rel="prev"
            aria-label="Previous page"
            className={`${ARROW_BASE} ${ARROW_ENABLED}`}
          >
            <ChevronLeft size={13} aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span aria-hidden="true" className={`${ARROW_BASE} ${ARROW_DISABLED}`}>
            <ChevronLeft size={13} aria-hidden="true" />
            Previous
          </span>
        )}

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
            ) : p === page ? (
              /* The current page is not a link to itself. */
              <span
                key={p}
                aria-current="page"
                aria-label={`Page ${p}, current page`}
                className={`${PAGE_BASE} border-[#8A5A6A] bg-[#8A5A6A] text-white`}
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={hrefForPage(p as number)}
                aria-label={`Page ${p}`}
                className={`${PAGE_BASE} border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900`}
              >
                {p}
              </Link>
            )
          )}
        </div>

        {/* Next */}
        {meta.hasNextPage ? (
          <Link
            href={hrefForPage(Math.min(totalPages, page + 1))}
            rel="next"
            aria-label="Next page"
            className={`${ARROW_BASE} ${ARROW_ENABLED}`}
          >
            Next
            <ChevronRight size={13} aria-hidden="true" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${ARROW_BASE} ${ARROW_DISABLED}`}>
            Next
            <ChevronRight size={13} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
