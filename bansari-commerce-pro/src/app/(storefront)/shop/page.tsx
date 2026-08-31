import { Suspense } from "react";
import type { Metadata } from "next";

import ShopEditorialHero from "@/components/shop/ShopEditorialHero";
import ShopTrustStrip from "@/components/shop/ShopTrustStrip";
import ShopCROStrip from "@/components/shop/ShopCROStrip";
import FilterSidebar from "@/components/shop/FilterSidebar";
import ShopToolbar from "@/components/shop/ShopToolbar";
import AppliedFilterChips from "@/components/shop/AppliedFilterChips";
import MobileFilterBar from "@/components/shop/MobileFilterBar";
import ProductGrid from "@/components/shop/ProductGrid";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";
import Pagination from "@/components/shop/Pagination";

import { getFilteredProducts } from "@/services/product.service";
import { getShopFacets } from "@/services/shop-facets";
import type { FilterParams, SortOption } from "@/types/filter-params";

// Filters read live catalog values — must not be frozen at build time.
export const revalidate = 60;

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // Short, so the layout's "| Bansari Collections" suffix still fits in the
  // ~60 characters Google renders. The old title already carried the brand,
  // so the template appended it a second time.
  title: "Shop Indian Ethnic Wear for Women",
  description:
    "Browse cotton kurta sets, linen co-ords, chikankari suits and printed kurtis. Filter by fabric, colour, size and price. Free shipping over ₹2,999.",
  openGraph: {
    title: "Shop Indian Ethnic Wear — Bansari Collections",
    description: "Cotton kurta sets, linen co-ords, chikankari suits and printed kurtis.",
    type: "website",
    images: ["/opengraph-image"],
  },
  // Was inheriting the root layout's homepage canonical, which told Google
  // this page was a duplicate and should not rank.
  alternates: { canonical: "/shop" },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── searchParams → FilterParams ─────────────────────────────────────────────
// Extracts and normalises every URL parameter into the canonical FilterParams
// shape consumed by getFilteredProducts and ProductGrid.

function parseSearchParams(raw: Record<string, string | string[] | undefined>): FilterParams {
  function str(key: string): string | undefined {
    const v = raw[key];
    if (!v) return undefined;
    return Array.isArray(v) ? v[0] : v;
  }

  function num(key: string): number | undefined {
    const v = str(key);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  const sortRaw = str("sort") as SortOption | undefined;
  const validSorts: SortOption[] = [
    "newest", "price_asc", "price_desc", "bestseller", "discount", "relevance",
  ];
  const sort: SortOption = sortRaw && validSorts.includes(sortRaw) ? sortRaw : "newest";

  // availability → inStock boolean mapping
  const availability = str("availability");
  const inStock =
    availability === "in_stock"
      ? true
      : availability === "out_of_stock"
        ? false
        : undefined;

  return {
    page:       num("page") ?? 1,
    perPage:    24,
    sort,
    category:   str("category"),
    collection: str("collection"),
    fabric:     str("fabric"),
    color:      str("color"),
    priceMin:   num("priceMin"),
    priceMax:   num("priceMax"),
    occasion:   str("occasion"),
    size:       str("size"),
    inStock,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const raw = await searchParams;
  const filterParams = parseSearchParams(raw);

  // Single RSC fetch for meta (total count, pagination).
  // ProductGrid makes its own internal call for the product rows.
  // This is the existing architecture — no double-fetching of row data.
  const [{ meta }, facets] = await Promise.all([
    getFilteredProducts(filterParams),
    getShopFacets(),
  ]);

  return (
    <>
      {/* ── Skip link ──────────────────────────────────────────────────────── */}
      <a
        href="#product-grid"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-[12px] focus:font-semibold focus:uppercase focus:tracking-wider focus:text-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]"
      >
        Skip to products
      </a>

      {/* ── Visually hidden H1 (SEO + screen readers) ─────────────────────── */}
      {/* ShopEditorialHero renders an H2; the logical H1 lives here for      */}
      {/* correct document outline without visual duplication.                */}
      <h1 className="sr-only">Shop — Bansari Collection Luxury Indian Ethnic Fashion</h1>

      {/* ── Editorial hero ─────────────────────────────────────────────────── */}
      <ShopEditorialHero />

      {/* ── Trust strip ────────────────────────────────────────────────────── */}
      <ShopTrustStrip />

      {/* ── CRO strip ──────────────────────────────────────────────────────── */}
      <ShopCROStrip />

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <main
        className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-10 lg:px-16"
        id="product-grid"
      >
        {/* ── Desktop toolbar ──────────────────────────────────────────────── */}
        {/* Hidden on mobile — MobileFilterBar handles sort+filter below 1024px */}
        <div className="hidden lg:block" aria-label="Sort and view controls">
          <ShopToolbar total={meta.total} />
        </div>

        {/* ── Applied filter chips — desktop + mobile ───────────────────────── */}
        <AppliedFilterChips />

        {/* ── Two-column layout: sidebar + grid ────────────────────────────── */}
        <div className="flex gap-10 lg:gap-12">

          {/* ── Desktop filter sidebar ─────────────────────────────────────── */}
          {/* Hidden on mobile — MobileFilterBar handles this below 1024px      */}
          <div
            className="hidden w-[240px] shrink-0 lg:block xl:w-[260px]"
            aria-label="Product filters"
          >
            <FilterSidebar facets={facets} />
          </div>

          {/* ── Product grid ───────────────────────────────────────────────── */}
          <div className="min-w-0 flex-1">
            {/* Mobile: count line above grid */}
            <p className="mb-4 text-[11px] uppercase tracking-[0.12em] text-slate-400 lg:hidden">
              {meta.total > 0 ? (
                <>
                  <span className="font-semibold text-slate-900">
                    {meta.total.toLocaleString()}
                  </span>{" "}
                  product{meta.total !== 1 ? "s" : ""}
                </>
              ) : null}
            </p>

            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid filterParams={filterParams} />
            </Suspense>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <Pagination meta={meta} />
            )}
          </div>
        </div>
      </main>

      {/* ── Mobile filter / sort bar (fixed bottom, visible < 1024px) ────────── */}
      {/* pb-[72px] on the page body is handled by the bar's own fixed height  */}
      <MobileFilterBar filterParams={filterParams} facets={facets} />
    </>
  );
}
