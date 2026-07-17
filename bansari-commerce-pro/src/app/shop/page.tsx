import MobileFilterBar from '@/components/shop/MobileFilterBar';
import type { Metadata } from "next";
import FilterSidebar from "@/components/shop/FilterSidebar";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopToolbar from "@/components/shop/ShopToolbar";
import ActiveFilters from "@/components/shop/ActiveFilters";
import Pagination from "@/components/shop/Pagination";
import ShopTrustStrip from "@/components/shop/ShopTrustStrip";
import CategoryPills from "@/components/shop/CategoryPills";
import ShopEditorialHero from "@/components/shop/ShopEditorialHero";
import ShopEditorialBreak from "@/components/shop/ShopEditorialBreak";
import ShopCROStrip from "@/components/shop/ShopCROStrip";
import ShopSocialProof from "@/components/shop/ShopSocialProof";


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

export default function ShopPage() {
  return (
    <>
      {/* Breadcrumb schema — PRESERVED */}
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

      <main className="min-h-screen bg-white">

        {/* ─── EDITORIAL CAMPAIGN HERO (NEW) ─── */}
        <ShopEditorialHero />

        {/* ─── PAGE HEADER ─── */}
        <div className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 lg:px-16">

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-[11px] tracking-wide text-slate-400">
                <li>
                  <a href="/" className="transition-colors duration-200 hover:text-slate-700">Home</a>
                </li>
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

          {/* Category scroll pills */}
          <CategoryPills />
        </div>

        {/* ─── LIVE SOCIAL PROOF TICKER (NEW) ─── */}
        <ShopSocialProof />

        {/* ─── MAIN LAYOUT ─── */}
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
              <ShopToolbar />
              <ActiveFilters />
              <ProductGrid />

              {/* ─── EDITORIAL BREAK mid-page (NEW) ─── */}
              <ShopEditorialBreak />

              <Pagination />
            </section>
          </div>
        </div>

        {/* ─── CRO STRIP — WhatsApp + Recently Viewed (NEW) ─── */}
        <ShopCROStrip />

        {/* ─── MobileFilterBar/Sort Bar (fixed bottom) ─── */}
        <MobileFilterBar />
      </main>
    </>
  );
}