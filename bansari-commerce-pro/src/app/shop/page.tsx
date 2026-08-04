import MobileFilterBar from '@/components/shop/MobileFilterBar';
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FilterSidebar from "@/components/shop/FilterSidebar";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopToolbar from "@/components/shop/ShopToolbar";
import ActiveFilters from "@/components/shop/ActiveFilters";
import ResultHeader from "@/components/shop/ResultHeader";
import Pagination from "@/components/shop/Pagination";
import ShopTrustStrip from "@/components/shop/ShopTrustStrip";
import CategoryPills from "@/components/shop/CategoryPills";
import ShopEditorialHero from "@/components/shop/ShopEditorialHero";
import ShopEditorialBreak from "@/components/shop/ShopEditorialBreak";
import ShopCROStrip from "@/components/shop/ShopCROStrip";
import ShopSocialProof from "@/components/shop/ShopSocialProof";
import { getFilteredProducts } from "@/services/product.service";
import type { FilterParams, SortOption } from "@/types/filter-params";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Shop All — Bansari Collections",
  description:
    "Discover our complete collection of luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Co-ord Sets, Gowns, and more. Crafted for weddings, festive celebrations, and everyday elegance.",
  alternates: { canonical: "https://bansaricollections.in/shop" },
  openGraph: {
    title: "Shop All — Bansari Collections",
    description: "Luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Gowns and more.",
    url: "https://bansaricollections.in/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop All — Bansari Collections",
    description: "Luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Gowns and more.",
  },
};

// ─── Helpers — parse raw URL searchParams strings safely ─────────────────────

const VALID_SORTS = new Set<SortOption>(
  ['newest', 'price_asc', 'price_desc', 'bestseller', 'discount']
);

function parseSort(raw: string | undefined): SortOption {
  return VALID_SORTS.has(raw as SortOption) ? (raw as SortOption) : 'newest';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parsePositiveFloat(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// ─── Page Component ──────────────────────────────────────────────────────────

type SearchParamsType = Record<string, string | string[] | undefined>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsType>;
}) {
  const sp = await searchParams;

  function str(key: string): string | undefined {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  }

  const filterParams: FilterParams = {
    page:       parsePositiveInt(str('page'), 1),
    perPage:    24,
    sort:       parseSort(str('sort')),
    category:   str('category'),
    collection: str('collection'),
    fabric:     str('fabric'),
    color:      str('color'),
    priceMin:   parsePositiveFloat(str('priceMin')),
    priceMax:   parsePositiveFloat(str('priceMax')),
    occasion:   str('occasion'),
    size:       str('size'),
    inStock:    str('availability') === 'in_stock' ? true
                : str('availability') === 'out_of_stock' ? false
                : undefined,
  };

  const { meta } = await getFilteredProducts(filterParams);

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://bansaricollections.in" },
              { "@type": "ListItem", position: 2, name: "Shop", item: "https://bansaricollections.in/shop" },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Shop All — Bansari Collections",
            description: "Luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Gowns and more.",
            url: "https://bansaricollections.in/shop",
          }),
        }}
      />

      <div className="pb-16 lg:pb-0">
        <main className="min-h-screen bg-white">

          <ShopEditorialHero />

          <div className="border-b border-slate-100 bg-white">
            <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 lg:px-16">
              <nav aria-label="Breadcrumb" className="mb-5">
                <ol className="flex items-center gap-2 text-[11px] tracking-wide text-slate-400">
                  <li><a href="/" className="transition-colors duration-200 hover:text-slate-700">Home</a></li>
                  <li aria-hidden="true" className="text-slate-200">/</li>
                  <li className="font-medium text-slate-900" aria-current="page">Shop</li>
                </ol>
              </nav>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.26em] text-[#8A5A6A]">
                    Bansari Collections
                  </p>
                  <h1 className="font-[family:var(--font-playfair)] text-[2rem] font-normal leading-tight text-slate-900 md:text-[2.5rem] lg:text-[3.2rem]">
                    The Collection
                  </h1>
                  <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-400">
                    Curated ethnic wear crafted for weddings, celebrations, and every occasion in between.
                  </p>
                </div>
                <ShopTrustStrip />
              </div>
            </div>
            <CategoryPills />
          </div>

          <ShopSocialProof />

          <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
            <div className="flex gap-10 py-8">

              {/* Filter Sidebar — sticky desktop */}
              <aside
                aria-label="Product filters"
                className="hidden w-[260px] shrink-0 lg:block"
              >
                <FilterSidebar />
              </aside>

              {/* Product section */}
              <section className="min-w-0 flex-1" aria-label="Product listing">

                {/* ShopToolbar — preserved, continues to receive total */}
                <ShopToolbar total={meta.total} />

                {/* ResultHeader — Showing X–Y of Z + sort dropdown */}
                <ResultHeader
                  total={meta.total}
                  page={meta.page}
                  perPage={meta.perPage}
                />

                {/* AppliedFilterChips via ActiveFilters re-export */}
                <ActiveFilters />

                <ProductGrid filterParams={filterParams} />

                <ShopEditorialBreak />

                <Pagination meta={meta} />
              </section>
            </div>
          </div>

          <ShopCROStrip />

          {/* Mobile bottom sheet */}
          <MobileFilterBar />
        </main>
      </div>

      <Footer />
    </>
  );
}
