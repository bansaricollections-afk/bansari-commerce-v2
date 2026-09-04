/**
 * Guide article — /guides/<slug>
 *
 * Article + BreadcrumbList schema, own canonical, and links back into the
 * catalogue. This is the informational half of the SEO plan: the landing pages
 * capture commercial intent, these capture the questions people ask before they
 * are ready to buy.
 */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import ArticleProgress from '@/components/guides/ArticleProgress';
import GuideBody from '@/components/guides/GuideBody';
import { guides, getGuide, type Guide } from '@/content/guides';
import { getGuideMedia, imageAt } from '@/lib/guide-media';

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

/**
 * Strips the inline markup vocabulary (`**`, `==`, `[x](/y)`) for contexts
 * that need plain text — structured data, meta tags. Schema must contain what
 * the reader sees, not the authoring syntax.
 */
function stripMarkup(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/==([^=]+)==/g, '$1');
}

/**
 * Reading time from the guide's own words. Counted, not estimated by hand, so
 * it stays true when an article is edited. 200 wpm is the usual figure for
 * considered non-fiction.
 */
function readingMinutes(guide: Guide): number {
  let words = 0;
  const count = (s: string) => {
    words += s.trim().split(/\s+/).length;
  };
  for (const b of guide.body) {
    if ('text' in b) count(b.text);
    if ('items' in b) {
      for (const item of b.items) count(typeof item === 'string' ? item : `${item.q} ${item.a}`);
    }
  }
  return Math.max(1, Math.round(words / 200));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = `${SITE_URL}/guides/${guide.slug}`;
  const media = await getGuideMedia(guide);
  const hero = guide.hero ? media.get(guide.hero.productId) : undefined;
  const minutes = readingMinutes(guide);

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
    // Only when a real image exists — never a fabricated or placeholder URL.
    ...(hero && guide.hero
      ? { image: [imageAt(hero, guide.hero.imageIndex)] }
      : {}),
    author: { '@type': 'Organization', name: 'Bansari Collections', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Bansari Collections',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-full.png` },
    },
  };

  /*
   * FAQPage schema, emitted only when the article actually has an FAQ block.
   * Every question and answer below comes from the article's own visible copy —
   * schema and page never disagree, which is what Google penalises.
   */
  const faqBlocks = guide.body.filter((b) => b.type === 'faq');
  const faqSchema =
    faqBlocks.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqBlocks.flatMap((b) =>
            b.items.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: stripMarkup(item.a) },
            }))
          ),
        }
      : null;

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
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <ArticleProgress />

      <main style={{ background: 'var(--bc-cream)' }}>
        <article>
          {/*
            COVER
            Full-bleed, title set over the photograph. This is the single
            strongest signal of an editorial register rather than a blog post —
            the image and the typography occupy the same space instead of
            stacking header-then-picture.

            The scrim is a two-stop gradient rather than a flat overlay: the top
            stays clear so the photograph reads, and the bottom carries enough
            density for the title to stay legible over any image. Without it,
            white text over a pale kurta becomes unreadable.
          */}
          {hero && guide.hero ? (
            /*
             * SPLIT COVER — photograph beside the type, not behind it.
             *
             * The catalogue is shot full-length in 4:5 portrait: face at the
             * top, garment falling to the floor. An earlier full-bleed
             * letterbox hero cropped that 4:5 into roughly 2:1, discarding
             * ~60% of the frame — which forces a choice between the model's
             * face and the garment, and loses whichever one you don't pick.
             * No object-position value can avoid that; it only picks the half
             * to throw away.
             *
             * Holding the image column at the source aspect ratio means the
             * photograph is never cropped at all. The type sits alongside on
             * the brand's dark surface, which also removes the need for a
             * scrim — text over the photo was what made contrast fragile.
             */
            <header className="grid lg:grid-cols-[1fr_1.02fr]">
              <div
                className="order-2 flex flex-col justify-center py-16 lg:order-1 lg:py-20"
                style={{ background: 'var(--bc-dark)', paddingInline: 'var(--bc-gutter)' }}
              >
                <p
                  className="mb-7 font-semibold uppercase"
                  style={{
                    fontSize: 'var(--bc-xs)',
                    letterSpacing: '0.34em',
                    color: 'var(--bc-gold-light)',
                  }}
                >
                  {guide.category}
                </p>

                <h1
                  className="font-normal"
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                    fontSize: 'var(--bc-2xl)',
                    lineHeight: 0.98,
                    letterSpacing: '-0.02em',
                    color: 'var(--bc-text-inverse)',
                    maxWidth: '15ch',
                    textWrap: 'balance',
                  }}
                >
                  {guide.title}
                </h1>

                <span
                  className="my-9 block h-px w-16"
                  style={{ background: 'var(--bc-gold)' }}
                  aria-hidden="true"
                />

                <p
                  className="italic"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 300,
                    fontSize: 'var(--bc-lg)',
                    lineHeight: 1.4,
                    color: 'rgba(255,253,249,0.82)',
                    maxWidth: '34ch',
                  }}
                >
                  {guide.excerpt}
                </p>

                <div
                  className="mt-12 flex flex-wrap items-center gap-4 uppercase"
                  style={{
                    fontSize: 'var(--bc-caption)',
                    letterSpacing: '0.22em',
                    color: 'rgba(255,253,249,0.55)',
                  }}
                >
                  <time dateTime={guide.publishedAt}>{formatDate(guide.publishedAt)}</time>
                  <span
                    className="block h-px w-8"
                    style={{ background: 'var(--bc-gold)' }}
                    aria-hidden="true"
                  />
                  <span>{minutes} minute read</span>
                </div>
              </div>

              {/*
                Held at the source 4:5 at every breakpoint, and the header
                height follows from it rather than from a viewport unit. A
                `min-h-[88vh]` here was measured cropping 12% off the bottom of
                the frame — the hem of the garment — because the column grew
                taller than the photograph's own ratio.
              */}
              <Link
                href={hero.href}
                className="group relative order-1 block aspect-[4/5] overflow-hidden lg:order-2"
                style={{ background: 'var(--bc-stone)' }}
              >
                <Image
                  src={imageAt(hero, guide.hero.imageIndex)}
                  alt={guide.hero.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                />
              </Link>
            </header>
          ) : (
            /* No honest image match — a typographic cover rather than a borrowed photo. */
            <header
              className="pb-16 pt-24"
              style={{ background: 'var(--bc-dark)', paddingInline: 'var(--bc-gutter)' }}
            >
              <div className="mx-auto" style={{ maxWidth: 'var(--bc-wide)' }}>
                <p
                  className="mb-6 font-semibold uppercase"
                  style={{
                    fontSize: 'var(--bc-xs)',
                    letterSpacing: '0.32em',
                    color: 'var(--bc-gold-light)',
                  }}
                >
                  {guide.category}
                </p>
                <h1
                  className="font-normal"
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                    fontSize: 'var(--bc-3xl)',
                    lineHeight: 0.94,
                    letterSpacing: '-0.02em',
                    color: 'var(--bc-text-inverse)',
                    maxWidth: '18ch',
                    textWrap: 'balance',
                  }}
                >
                  {guide.title}
                </h1>
                <p
                  className="mt-8 italic"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 300,
                    fontSize: 'var(--bc-lg)',
                    lineHeight: 1.4,
                    color: 'rgba(255,253,249,0.86)',
                    maxWidth: '46ch',
                  }}
                >
                  {guide.excerpt}
                </p>
                <div
                  className="mt-10 flex flex-wrap items-center gap-4 uppercase"
                  style={{
                    fontSize: 'var(--bc-caption)',
                    letterSpacing: '0.22em',
                    color: 'rgba(255,253,249,0.62)',
                  }}
                >
                  <time dateTime={guide.publishedAt}>{formatDate(guide.publishedAt)}</time>
                  <span
                    className="block h-px w-8"
                    style={{ background: 'var(--bc-gold)' }}
                    aria-hidden="true"
                  />
                  <span>{minutes} minute read</span>
                </div>
              </div>
            </header>
          )}

          <div className="pb-24 pt-20" style={{ paddingInline: 'var(--bc-gutter)' }}>
            <div className="mx-auto" style={{ maxWidth: 'var(--bc-wide)' }}>
              <nav
                aria-label="Breadcrumb"
                className="mb-14 uppercase"
                style={{
                  fontSize: 'var(--bc-caption)',
                  letterSpacing: '0.18em',
                  color: 'var(--bc-text-muted)',
                }}
              >
                <Link href="/" className="transition-colors hover:text-[var(--bc-brand-mauve)]">
                  Home
                </Link>
                <span className="px-2.5" aria-hidden="true">/</span>
                <Link
                  href="/guides"
                  className="transition-colors hover:text-[var(--bc-brand-mauve)]"
                >
                  Guides
                </Link>
              </nav>

              <GuideBody blocks={guide.body} media={media} />
            </div>
          </div>
        </article>

        <div className="pb-24" style={{ paddingInline: 'var(--bc-gutter)' }}>
          <div className="mx-auto" style={{ maxWidth: 'var(--bc-wide)' }}>
            {related.length > 0 && (
            <aside
              className="pt-10"
              style={{ borderTop: '1px solid var(--bc-border)' }}
            >
              <p
                className="mb-6 font-semibold uppercase"
                style={{
                  fontSize: 'var(--bc-xs)',
                  letterSpacing: '0.18em',
                  color: 'var(--bc-text-gold)',
                }}
              >
                Read next
              </p>
              <div className="grid gap-6 sm:grid-cols-3">
                {related.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group p-6 transition-colors"
                    style={{
                      background: 'var(--bc-warm)',
                      borderTop: '2px solid transparent',
                    }}
                  >
                    <p
                      className="mb-3 font-semibold uppercase"
                      style={{
                        fontSize: 'var(--bc-xs)',
                        letterSpacing: '0.16em',
                        color: 'var(--bc-text-gold)',
                      }}
                    >
                      {g.category}
                    </p>
                    <p
                      className="font-normal leading-snug transition-colors group-hover:text-[var(--bc-brand-mauve)]"
                      style={{
                        fontFamily:
                          "var(--font-playfair), 'Playfair Display', Georgia, serif",
                        fontSize: 'var(--bc-md)',
                        color: 'var(--bc-text-rich)',
                      }}
                    >
                      {g.title}
                    </p>
                  </Link>
                ))}
              </div>
            </aside>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
