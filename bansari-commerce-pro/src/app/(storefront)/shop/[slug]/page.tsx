/**
 * Browse landing page — /shop/<slug>
 *
 * Indexable equivalents of the /shop filters: /shop/cotton-kurta-sets rather
 * than /shop?category=Kurta%20Sets&fabric=Cotton. The query-string view keeps
 * working for people already browsing; it simply carries /shop's canonical and
 * therefore cannot rank.
 *
 * The set of pages is generated in services/browse-landings.ts, which only
 * emits a landing where the filter has at least MIN_PRODUCTS behind it — see
 * the note there on why a thin page is worse than no page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import ProductGrid from '@/components/shop/ProductGrid';
import ProductGridSkeleton from '@/components/shop/ProductGridSkeleton';
import { getBrowseLandings, findBrowseLanding, type BrowseLanding } from '@/services/browse-landings';

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

type Props = { params: Promise<{ slug: string }> };

/**
 * One factual sentence per page.
 *
 * Deliberately generated rather than hand-written per landing: there is no
 * per-landing copy in the database, and inventing a paragraph for each would be
 * fabricated marketing claims. Everything here is derived from the filter and
 * the live count.
 */
function introFor(landing: BrowseLanding): string {
  const n = landing.count;
  const pieces = `${n} ${n === 1 ? 'piece' : 'pieces'}`;
  switch (landing.kind) {
    case 'category':
      return `${pieces} of ${landing.heading.toLowerCase()} from Bansari Collections, a boutique in Vadodara. Free shipping on orders over ₹2,999 and 7-day returns.`;
    case 'fabric':
      return `${pieces} in ${landing.filter.fabric?.toLowerCase()} from Bansari Collections, a boutique in Vadodara. Free shipping on orders over ₹2,999 and 7-day returns.`;
    default:
      return `${pieces} of ${landing.filter.fabric?.toLowerCase()} ${landing.filter.category?.toLowerCase()} from Bansari Collections, a boutique in Vadodara. Free shipping on orders over ₹2,999 and 7-day returns.`;
  }
}

export async function generateStaticParams() {
  const landings = await getBrowseLandings();
  return landings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = await findBrowseLanding(slug);
  if (!landing) return { title: 'Not Found' };

  const description = introFor(landing);

  return {
    title: `${landing.heading} for Women`,
    description,
    alternates: { canonical: `/shop/${landing.slug}` },
    openGraph: {
      title: `${landing.heading} | Bansari Collections`,
      description,
      type: 'website',
      url: `${SITE_URL}/shop/${landing.slug}`,
      images: ['/opengraph-image'],
    },
  };
}

export default async function BrowseLandingPage({ params }: Props) {
  const { slug } = await params;
  const landing = await findBrowseLanding(slug);
  if (!landing) notFound();

  const url = `${SITE_URL}/shop/${landing.slug}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 3, name: landing.heading, item: url },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${landing.heading} — Bansari Collections`,
    description: introFor(landing),
    url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-10 lg:px-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[11px] tracking-[0.08em] text-slate-400">
          <Link href="/" className="hover:text-[#8A5A6A]">Home</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <Link href="/shop" className="hover:text-[#8A5A6A]">Shop</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span className="text-slate-600">{landing.heading}</span>
        </nav>

        <header className="mb-10 max-w-2xl">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
            {landing.kind === 'fabric' ? 'Fabric' : 'Shop'}
          </p>
          <h1 className="font-[family:var(--font-playfair)] text-4xl font-normal leading-tight text-slate-900">
            {landing.heading}
          </h1>
          <p className="mt-4 leading-relaxed text-slate-600">{introFor(landing)}</p>
        </header>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid filterParams={{ ...landing.filter, perPage: 24 }} />
        </Suspense>

        {/*
          Sibling landings, so these pages link to one another instead of each
          being a dead end reachable only from the sitemap. Internal links are
          how the rest of the set gets crawled.
        */}
        <SiblingLinks currentSlug={landing.slug} />
      </main>
    </>
  );
}

async function SiblingLinks({ currentSlug }: { currentSlug: string }) {
  const landings = await getBrowseLandings();
  const others = landings.filter((l) => l.slug !== currentSlug).slice(0, 8);
  if (others.length === 0) return null;

  return (
    <nav aria-label="Related collections" className="mt-16 border-t border-slate-200 pt-8">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Also browse
      </p>
      <div className="flex flex-wrap gap-2">
        {others.map((l) => (
          <Link
            key={l.slug}
            href={`/shop/${l.slug}`}
            className="border border-slate-200 bg-white px-4 py-2 text-[11px] font-medium tracking-[0.06em] text-slate-600 transition-colors hover:border-[#8A5A6A] hover:text-[#8A5A6A]"
          >
            {l.heading}
            <span className="ml-2 text-slate-400">{l.count}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
