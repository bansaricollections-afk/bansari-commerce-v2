/**
 * Guides index — /guides
 *
 * The informational hub. Every guide links from here, so the whole set is
 * crawlable by following links rather than only from the sitemap.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { guides } from '@/content/guides';
import { jsonLd } from '@/lib/json-ld';

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

export const metadata: Metadata = {
  title: 'Guides — Fabric, Fit and Occasion',
  description:
    'Practical guides to Indian ethnic wear: choosing fabric for Indian summers, washing cotton without shrinking it, kurta sizing, and what to wear for Navratri, Diwali and weddings.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Guides | Bansari Collections',
    description:
      'Practical guides to fabric, fit and occasion dressing in Indian ethnic wear.',
    type: 'website',
    url: `${SITE_URL}/guides`,
    images: ['/opengraph-image'],
  },
};

/** Grouped so the index reads as a library rather than a feed. */
const CATEGORY_ORDER = ['Occasion', 'Fabric & Care', 'Fit & Size', 'Buying Guide'] as const;

export default function GuidesIndexPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
    ],
  };

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: guides.length,
    itemListElement: guides.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/guides/${g.slug}`,
      name: g.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(listSchema) }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-10 lg:px-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[11px] tracking-[0.08em] text-slate-400">
          <Link href="/" className="hover:text-[#8A5A6A]">Home</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span className="text-slate-600">Guides</span>
        </nav>

        <header className="mb-14 max-w-2xl">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
            Bansari Collections
          </p>
          <h1 className="font-[family:var(--font-playfair)] text-[clamp(2rem,4vw,3rem)] font-normal leading-tight text-slate-900">
            Guides
          </h1>
          <p className="mt-4 leading-relaxed text-slate-600">
            Fabric, fit and occasion — what we get asked most often, written down properly.
          </p>
        </header>

        {CATEGORY_ORDER.map((category) => {
          const inCategory = guides.filter((g) => g.category === category);
          // A category with nothing in it renders nothing, rather than an empty heading.
          if (inCategory.length === 0) return null;

          return (
            <section key={category} className="mb-14">
              <h2 className="mb-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {category}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group flex flex-col border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-[#8A5A6A] hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
                  >
                    <h3 className="font-[family:var(--font-playfair)] text-xl font-normal leading-snug text-slate-900">
                      {g.title}
                    </h3>
                    <p className="mt-3 flex-1 text-[13px] leading-relaxed text-slate-500">
                      {g.excerpt}
                    </p>
                    <span className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A5A6A]">
                      Read guide &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
