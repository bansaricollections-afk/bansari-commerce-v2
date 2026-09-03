/**
 * Guide article — /guides/<slug>
 *
 * Article + BreadcrumbList schema, own canonical, and links back into the
 * catalogue. This is the informational half of the SEO plan: the landing pages
 * capture commercial intent, these capture the questions people ask before they
 * are ready to buy.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import GuideBody from '@/components/guides/GuideBody';
import { guides, getGuide } from '@/content/guides';

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: `${SITE_URL}/guides/${guide.slug}`,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      images: ['/opengraph-image'],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = `${SITE_URL}/guides/${guide.slug}`;

  /*
   * Article schema. `author` and `publisher` are the business itself — the only
   * attribution that is true. No byline is invented for a named person.
   */
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'Bansari Collections', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Bansari Collections',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-full.png` },
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: url },
    ],
  };

  // Same category first, so related reading is actually related.
  const related = guides
    .filter((g) => g.slug !== guide.slug)
    .sort((a, b) => (a.category === guide.category ? -1 : 0) - (b.category === guide.category ? -1 : 0))
    .slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-10 lg:px-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[11px] tracking-[0.08em] text-slate-400">
          <Link href="/" className="hover:text-[#8A5A6A]">Home</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <Link href="/guides" className="hover:text-[#8A5A6A]">Guides</Link>
        </nav>

        <article>
          <header className="mb-10 max-w-2xl">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
              {guide.category}
            </p>
            <h1 className="font-[family:var(--font-playfair)] text-[clamp(1.75rem,4vw,2.75rem)] font-normal leading-[1.15] text-slate-900">
              {guide.title}
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-slate-500">{guide.excerpt}</p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <time dateTime={guide.publishedAt}>{formatDate(guide.publishedAt)}</time>
            </p>
          </header>

          <GuideBody blocks={guide.body} />
        </article>

        {related.length > 0 && (
          <aside className="mt-16 border-t border-slate-200 pt-8">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Read next
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="group border border-slate-200 bg-white p-5 transition-all hover:border-[#8A5A6A]"
                >
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A5A6A]">
                    {g.category}
                  </p>
                  <p className="font-[family:var(--font-playfair)] text-lg font-normal leading-snug text-slate-900">
                    {g.title}
                  </p>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </main>
    </>
  );
}
