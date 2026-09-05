import { jsonLd } from '@/lib/json-ld';
/**
 * Collection landing page — /collections/[slug]
 *
 * WHY THIS EXISTS
 * Collections were previously reachable only as /shop?collection=<name>. That
 * view carries the shop page's own canonical (/shop) and the shop page's
 * generic title, so every collection told Google it was a duplicate of /shop
 * and none of them could rank. The site had zero rankable collection URLs.
 *
 * These pages are the indexable entry point: their own canonical, title,
 * description, H1 and structured data. /shop?collection= keeps working as a
 * filter for people already browsing — it just is not the thing search engines
 * are pointed at.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProductGrid from "@/components/shop/ProductGrid";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";
import { getShopFacets } from "@/services/shop-facets";
import { getFilteredProducts } from "@/services/product.service";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { collectionSlug, resolveCollectionSlug } from "@/lib/collection-slug";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bansaricollection.in";

/**
 * Trim to `max` on a word boundary. A meta description cut mid-word ("Free
 * shipping ove") looks broken in a search result.
 */
function trimToLength(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-]$/, "") + "…";
}

type Props = { params: Promise<{ slug: string }> };

/**
 * Optional editorial copy for a collection, when the `collections` table has a
 * row whose slug matches. Absent copy is simply omitted — never invented.
 */
async function getCollectionCopy(slug: string): Promise<string | null> {
  try {
    const sb = createServiceRoleClient();
    const { data } = await sb
      .from("collections")
      .select("description")
      .eq("slug", slug)
      .maybeSingle();
    const description = (data as { description?: string } | null)?.description;
    return description?.trim() ? description.trim() : null;
  } catch {
    return null;
  }
}

/** Pre-render the collections that actually have products. */
export async function generateStaticParams() {
  const { collections } = await getShopFacets();
  return collections.map((name) => ({ slug: collectionSlug(name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { collections } = await getShopFacets();
  const name = resolveCollectionSlug(slug, collections);
  if (!name) return { title: "Collection Not Found" };

  const [{ meta }, copy] = await Promise.all([
    getFilteredProducts({ collection: name, perPage: 1 }),
    getCollectionCopy(slug),
  ]);

  /*
   * The collection copy in the database is a tagline, not a meta description —
   * they run 18 to 33 characters ("Most popular picks"), against the ~155
   * Google renders. Using it alone produced a 30-character description.
   *
   * So it is a PREFIX to the factual sentence rather than a replacement. The
   * rest states only what is verifiably true: the count comes from the same
   * query that renders the grid, so it cannot claim stock that is not there.
   */
  const factual = `Shop the ${name} collection at Bansari Collections — ${meta.total} ${
    meta.total === 1 ? "piece" : "pieces"
  } of handcrafted Indian ethnic wear for women. Free shipping over ₹2,999.`;
  const description = trimToLength(copy ? `${copy}. ${factual}` : factual, 158);

  return {
    title: `${name} — Indian Ethnic Wear`,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      title: `${name} | Bansari Collections`,
      description,
      type: "website",
      url: `${SITE_URL}/collections/${slug}`,
      images: ["/opengraph-image"],
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const { collections } = await getShopFacets();

  // Only collections that hold at least one live product resolve. Anything else
  // 404s rather than publishing an empty, thin page.
  const name = resolveCollectionSlug(slug, collections);
  if (!name) notFound();

  const [{ products, meta }, copy] = await Promise.all([
    getFilteredProducts({ collection: name, perPage: 24 }),
    getCollectionCopy(slug),
  ]);

  if (meta.total === 0) notFound();

  const url = `${SITE_URL}/collections/${slug}`;

  /*
   * CollectionPage + ItemList describes what this URL is. The list is built
   * from the products actually rendered, so it can never advertise items the
   * page does not show.
   */
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${name} — Bansari Collections`,
    url,
    ...(copy && { description: copy }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: meta.total,
      itemListElement: products.slice(0, 24).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/product/${p.id}`,
        name: p.name,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/collections` },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-10 lg:px-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 text-[11px] tracking-[0.08em] text-slate-400">
          <Link href="/" className="hover:text-[#8A5A6A]">Home</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <Link href="/collections" className="hover:text-[#8A5A6A]">Collections</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span className="text-slate-600">{name}</span>
        </nav>

        {/* Header — eyebrow + serif heading, matching the site's section pattern */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
            Collection
          </p>
          <h1 className="font-[family:var(--font-playfair)] text-4xl font-normal leading-tight text-slate-900">
            {name}
          </h1>
          {/* Copy is shown only when the collection actually has some. */}
          {copy && (
            <p className="mt-4 leading-relaxed text-slate-600">{copy}</p>
          )}
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-slate-400">
            {meta.total} {meta.total === 1 ? "piece" : "pieces"}
          </p>
        </header>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid filterParams={{ collection: name, perPage: 24 }} />
        </Suspense>

        {/* A route out, so the page is not a dead end for people or crawlers. */}
        <div className="mt-16 border-t border-slate-200 pt-8">
          <Link
            href={`/shop?collection=${encodeURIComponent(name)}`}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A5A6A] hover:text-slate-900"
          >
            Filter this collection in Shop &rarr;
          </Link>
        </div>
      </main>
    </>
  );
}
