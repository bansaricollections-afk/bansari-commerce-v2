import { jsonLd } from '@/lib/json-ld';
import type { Metadata } from "next";
import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { collectionSlug } from "@/lib/collection-slug";

// Renders live catalog collections — must not be frozen at build time.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop by Collection",
  description:
    "Explore curated ethnic wear collections from Bansari Collections — cotton kurta sets, linen co-ords, chikankari and printed suits for every occasion.",
  alternates: { canonical: "https://www.bansaricollection.in/collections" },
  openGraph: {
    title: "Collections — Bansari Collections",
    description: "Explore Bansari Collections' curated ethnic wear collections.",
    url: "https://www.bansaricollection.in/collections",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collections — Bansari Collections",
    description: "Explore Bansari Collections' curated ethnic wear collections.",
  },
};

type Card = {
  /** Exact stored value from products.collection — used verbatim in the link. */
  name: string;
  count: number;
  image: string;
  href: string;
};

// ── Real, product-backed collections only ──────────────────────────────────
// Source of truth: the products table's `collection` text field — the same
// field Admin Product Management writes and the same one /shop filters on.
// This is deliberately NOT the `category` field: categories are a separate
// taxonomy with their own cards on the homepage. Values are used verbatim
// (never slugified) because the shop filter matches the stored string.
async function getRealCollections(): Promise<Card[]> {
  const supabase = createServiceRoleClient();

  const { data: products } = await supabase
    .from("products")
    .select("collection, images, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const rows = products ?? [];

  // Group by collection, keeping the newest product's first valid image.
  const byCollection = new Map<string, { count: number; image: string }>();
  for (const row of rows) {
    const collection = row.collection as string | null;
    if (!collection) continue;
    const firstImage = Array.isArray(row.images) ? row.images[0]?.url : undefined;
    const existing = byCollection.get(collection);
    if (existing) {
      existing.count += 1;
      if (!existing.image && firstImage) existing.image = firstImage;
    } else {
      byCollection.set(collection, { count: 1, image: firstImage ?? "" });
    }
  }

  const cards: Card[] = [];
  for (const [collection, info] of byCollection) {
    if (!info.image) continue; // never show a card without a real product image
    cards.push({
      name: collection,
      count: info.count,
      image: info.image,
      // Points at the collection landing page, not the filtered shop view.
      // The landing page is the indexable URL: /shop?collection= carries the
      // shop page's own canonical, so it can never rank on its own.
      href: `/collections/${collectionSlug(collection)}`,
    });
  }
  cards.sort((a, b) => b.count - a.count);

  return cards;
}

export default async function CollectionsPage() {
  const collections = await getRealCollections();
  const totalPieces = collections.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.bansaricollection.in" },
              { "@type": "ListItem", position: 2, name: "Collections", item: "https://www.bansaricollection.in/collections" },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Collections — Bansari Collections",
            url: "https://www.bansaricollection.in/collections",
          }),
        }}
      />

      <main className="min-h-screen bg-slate-50">
        {/* ─── Editorial Header ─── */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-16">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-[11px] tracking-wide text-slate-400">
                <li><a href="/" className="transition-colors duration-200 hover:text-slate-700">Home</a></li>
                <li aria-hidden="true" className="text-slate-200">/</li>
                <li className="font-medium text-slate-900" aria-current="page">Collections</li>
              </ol>
            </nav>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A5A6A]">
                  Bansari Collections
                </p>
                <h1 className="font-[family:var(--font-playfair)] text-[2rem] font-normal leading-tight text-slate-900 md:text-[2.75rem] lg:text-[3.5rem]">
                  Our Collections
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
                  Curated ethnic wear, organised the way we actually stock it.
                </p>
              </div>

              <div className="hidden gap-10 lg:flex">
                <div className="text-right">
                  <p className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900">{totalPieces}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    {totalPieces === 1 ? "Piece" : "Pieces"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-[family:var(--font-playfair)] text-3xl font-normal text-slate-900">
                    {collections.length}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    {collections.length === 1 ? "Collection" : "Collections"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Collections grid — real products only ─── */}
        <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-16">
          {collections.length === 0 ? (
            <p className="text-sm text-slate-500">No collections available yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {collections.map((col) => (
                <Link
                  key={col.name}
                  href={col.href}
                  className="group relative flex flex-col overflow-hidden border border-slate-200 bg-white transition-all duration-500 hover:border-slate-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
                  aria-label={`Browse ${col.name}`}
                >
                  {/*
                    Real product image hero.

                    The frame is portrait (3/4), matching the product
                    photography and the aspect ratio used everywhere else on the
                    site. It was a fixed h-56, which on a ~300-400px wide card
                    is a landscape box — so object-cover centre-cropped portrait
                    shots and cut off the model's head and the hem of the
                    garment.

                    object-top biases the remaining crop upward, so where the
                    source is taller than 3/4 the neckline and yoke survive
                    rather than the floor.
                  */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F7F3EE]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={col.image}
                      alt={col.name}
                      className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {col.count} {col.count === 1 ? "piece" : "pieces"}
                    </p>
                    <h2 className="font-[family:var(--font-playfair)] text-xl font-normal leading-snug text-slate-900">
                      {col.name}
                    </h2>

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
          )}
        </div>

        {/* ─── Editorial CTA ─── */}
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-5 py-16 text-center md:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A5A6A]">Can't decide?</p>
            <h2 className="font-[family:var(--font-playfair)] text-2xl font-normal text-slate-900 md:text-3xl">
              Browse the Full Collection
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Explore every piece across the full catalogue — filtered and sorted your way.
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
