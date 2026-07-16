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
  },
  {
    slug: "sarees",
    label: "Sarees",
    sub: "Six yards of timeless artistry",
    count: "64 pieces",
    accent: "#EEF0F5",
  },
  {
    slug: "lehengas",
    label: "Lehengas",
    sub: "Bridal grandeur, redefined",
    count: "32 pieces",
    accent: "#F4EFF5",
  },
  {
    slug: "coord-sets",
    label: "Co-ord Sets",
    sub: "Modern coordinates for contemporary India",
    count: "40 pieces",
    accent: "#EEF5F0",
  },
  {
    slug: "gowns",
    label: "Gowns",
    sub: "Floor-length silhouettes for landmark moments",
    count: "28 pieces",
    accent: "#F5F1EE",
  },
  {
    slug: "new-arrivals",
    label: "New Arrivals",
    sub: "First-to-know, first-to-wear",
    count: "Fresh this week",
    accent: "#FFFAEC",
  },
  {
    slug: "festive-wear",
    label: "Festive Wear",
    sub: "Dazzle every celebration",
    count: "56 pieces",
    accent: "#FFF5EE",
  },
  {
    slug: "ethnic-dresses",
    label: "Ethnic Dresses",
    sub: "One-piece ease, cultural soul",
    count: "36 pieces",
    accent: "#EEFAF8",
  },
];

export default function CollectionsPage() {
  return (
    <>
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

      <main className="min-h-screen bg-slate-50">
        {/* ─── Header ─── */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-16">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-slate-500">
                <li><a href="/" className="transition hover:text-slate-900">Home</a></li>
                <li aria-hidden="true" className="text-slate-300">/</li>
                <li className="text-slate-900" aria-current="page">Collections</li>
              </ol>
            </nav>

            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8A5A6A]">Bansari Collections</p>
            <h1 className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900 md:text-4xl">
              Our Collections
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
              Each collection is thoughtfully curated — from the wedding mandap to the office boardroom.
            </p>
          </div>
        </div>

        {/* ─── Grid ─── */}
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((col) => (
              <Link
                key={col.slug}
                href={`/shop?collection=${col.slug}`}
                className="group relative overflow-hidden rounded-none border border-slate-200 bg-white transition-shadow duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
                aria-label={`Browse ${col.label}`}
              >
                {/* Colour swatch hero */}
                <div
                  className="h-36 w-full transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{ backgroundColor: col.accent }}
                  aria-hidden="true"
                />

                <div className="p-6">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    {col.count}
                  </p>
                  <h2 className="font-[family:var(--font-playfair)] text-xl font-normal text-slate-900">
                    {col.label}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{col.sub}</p>

                  <span
                    className="mt-4 inline-block text-xs font-medium tracking-[0.08em] text-[#8A5A6A] underline-offset-4 transition group-hover:underline"
                    aria-hidden="true"
                  >
                    Explore &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
