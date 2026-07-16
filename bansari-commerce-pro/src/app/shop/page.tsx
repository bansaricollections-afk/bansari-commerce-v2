import type { Metadata } from "next";
import FilterSidebar from "@/components/shop/FilterSidebar";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopToolbar from "@/components/shop/ShopToolbar";
import ActiveFilters from "@/components/shop/ActiveFilters";
import Pagination from "@/components/shop/Pagination";
import ShopTrustStrip from "@/components/shop/ShopTrustStrip";
import MobileFilterBar from "@/components/shop/MobileFilterBar";

export const metadata: Metadata = {
  title: "Shop All — Bansari Collections",
  description:
    "Discover our complete collection of luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Co-ord Sets, Gowns, and more. Crafted for weddings, festive celebrations, and everyday elegance.",
  alternates: { canonical: "https://bansaricollections.com/shop" },
  openGraph: {
    title: "Shop All — Bansari Collections",
    description: "Luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Gowns and more.",
    url: "https://bansaricollections.com/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop All — Bansari Collections",
    description: "Luxury ethnic wear — Kurta Sets, Sarees, Lehengas, Gowns and more.",
  },
};

export default function ShopPage() {
  return (
    <>
      {/* Breadcrumb schema */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://bansaricollections.com" },
              { "@type": "ListItem", position: 2, name: "Shop", item: "https://bansaricollections.com/shop" },
            ],
          }),
        }}
      />

      <main className="min-h-screen bg-slate-50">
        {/* ─── Editorial Page Header ─── */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 lg:px-16">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-xs text-slate-500">
                <li><a href="/" className="transition hover:text-slate-900">Home</a></li>
                <li aria-hidden="true" className="text-slate-300">/</li>
                <li className="text-slate-900" aria-current="page">Shop</li>
              </ol>
            </nav>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8A5A6A]">Bansari Collections</p>
                <h1 className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  The Collection
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
                  Curated ethnic wear crafted for weddings, celebrations, and every occasion in between.
                </p>
              </div>
              <ShopTrustStrip />
            </div>
          </div>
        </div>

        {/* ─── Main Layout ─── */}
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
            <section className="min-w-0 flex-1">
              <ShopToolbar />
              <ActiveFilters />
              <ProductGrid />
              <Pagination />
            </section>
          </div>
        </div>

        {/* ─── Mobile Filter/Sort Bar (fixed bottom) ─── */}
        <MobileFilterBar />
      </main>
    </>
  );
}
