import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collections — Bansari Collections",
  description:
    "Explore Bansari Collections — Kurta Sets, Sarees, Lehengas, Co-ord Sets, Gowns, Festive Wear, and New Arrivals. Luxury ethnic wear for every occasion.",
  alternates: { canonical: "https://bansaricollections.com/collections" },
  openGraph: {
    title: "Collections — Bansari Collections",
    description: "Luxury ethnic wear collections — Sarees, Lehengas, Kurta Sets, Gowns, and more.",
    url: "https://bansaricollections.com/collections",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collections — Bansari Collections",
    description: "Luxury ethnic wear collections — Sarees, Lehengas, Kurta Sets, Gowns, and more.",
  },
};

const collections = [
  {
    slug: "kurta-sets",
    label: "Kurta Sets",
    sub: "Effortless layering for every occasion",
    count: "48 pieces",
    accent: "#F5EDE8",
    accentDark: "#C4A895",
    tag: "Most Popular",
  },
  {
    slug: "sarees",
    label: "Sarees",
    sub: "Six yards of timeless artistry",
    count: "64 pieces",
    accent: "#EEF0F5",
    accentDark: "#94A3B8",
    tag: "Heritage",
  },
  {
    slug: "lehengas",
    label: "Lehengas",
    sub: "Bridal grandeur, redefined",
    count: "32 pieces",
    accent: "#F4EFF5",
    accentDark: "#A78BBB",
    tag: "Bridal",
  },
  {
    slug: "coord-sets",
    label: "Co-ord Sets",
    sub: "Modern coordinates for contemporary India",
    count: "40 pieces",
    accent: "#EEF5F0",
    accentDark: "#86A895",
    tag: "Contemporary",
  },
  {
    slug: "gowns",
    label: "Gowns",
    sub: "Floor-length silhouettes for landmark moments",
    count: "28 pieces",
    accent: "#F5F1EE",
    accentDark: "#B8A898",
    tag: "Evening",
  },
  {
    slug: "new-arrivals",
    label: "New Arrivals",
    sub: "First-to-know, first-to-wear",
    count: "Fresh this week",
    accent: "#FFFAEC",
    accentDark: "#C4A84C",
    tag: "New",
  },
  {
    slug: "festive-wear",
    label: "Festive Wear",
    sub: "Dazzle every celebration",
    count: "56 pieces",
    accent: "#FFF5EE",
    accentDark: "#D4956A",
    tag: "Festive",
  },
  {
    slug: "ethnic-dresses",
    label: "Ethnic Dresses",
    sub: "One-piece ease, cultural soul",
    count: "36 pieces",
    accent: "#EEFAF8",
    accentDark: "#7EB8B0",
    tag: "Casual",
  },
];

export default function CollectionsPage() {
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
              { "@type": "ListItem", position: 2, name: "Collections", item: "https://bansaricollections.com/collections" },
            ],
          }),
        }}
      />

      {/* CollectionPage schema */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Collections — Bansari Collections",
            description: "Luxury ethnic wear collections — Sarees, Lehengas, Kurta Sets, Gowns, and more.",
            url: "https://bansaricollections.com/collections",
          }),
        }}
      />

      <main className="min-h-screen bg-slate-50">

        {/* ─── Editorial Header ─── */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-16">

            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-[11px] tracking-wide text-slate-400">
                <li>
                  <a href="/" className="transition-colors duration-200 hover:text-slate-700">Home</a>
                </li>
                <li aria-hidden="true" className="text-slate-200">/</li>
                <li className="font-medium text-slate-900" aria-current="page">Collections</li>
              </ol>
            </nav>

            {/* Hero text — editorial 2-column layout */}
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A5A6A]">
                  Bansari Collections
                </p>
                <h1 className="font-[family:var(--font-playfair)] text-[2rem] font-normal leading-tight text-slate-900 md:text-[2.75rem] lg:text-[3.5rem]">
                  Our Collections
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
                  Eight carefully curated lines — from the wedding mandap to the office boardroom. Each piece is an act of craft.
                </p>
              </div>

              {/* Stats strip */}
              <div className="hidden gap-10 lg:flex">
                {[
                  { num: "300+", label: "Designs" },
                  { num: "8", label: "Collections" },
                  { num: "12+", label: "Fabrics" },
                ].map((s) => (
                  <div key={s.label} className="text-right">
                    <p className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900">{s.num}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Collections grid ─── */}
        <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((col) => (
              <Link
                key={col.slug}
                href={`/shop?collection=${col.slug}`}
                className="group relative flex flex-col overflow-hidden border border-slate-200 bg-white transition-all duration-500 hover:border-slate-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
                aria-label={`Browse ${col.label}`}
              >
                {/* Colour swatch hero */}
                <div
                  className="relative h-44 w-full overflow-hidden"
                  style={{ backgroundColor: col.accent }}
                  aria-hidden="true"
                >
                  {/* Animated diagonal accent line */}
                  <div
                    className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-60"
                    style={{
                      background: `linear-gradient(135deg, transparent 40%, ${col.accentDark}22 60%, ${col.accentDark}44 80%, transparent 100%)`,
                    }}
                  />
                  {/* Tag */}
                  <span
                    className="absolute left-4 top-4 border border-current px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: col.accentDark }}
                  >
                    {col.tag}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {col.count}
                  </p>
                  <h2 className="font-[family:var(--font-playfair)] text-xl font-normal leading-snug text-slate-900">
                    {col.label}
                  </h2>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{col.sub}</p>

                  {/* CTA arrow — slides in on hover */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A5A6A]">
                      Explore
                    </span>
                    <span
                      className="flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-[#8A5A6A] group-hover:bg-[#8A5A6A] group-hover:text-white"
                      aria-hidden="true"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Editorial CTA ─── */}
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-5 py-16 text-center md:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A5A6A]">
              Can't decide?
            </p>
            <h2 className="font-[family:var(--font-playfair)] text-2xl font-normal text-slate-900 md:text-3xl">
              Browse the Full Collection
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Explore every piece across all categories — filtered and sorted your way.
            </p>
            <Link
              href="/shop"
              className="mt-2 inline-flex items-center gap-3 border border-slate-900 bg-slate-900 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
            >
              Shop All
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
