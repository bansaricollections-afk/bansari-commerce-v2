import Link from 'next/link';

import { getBrowseLandings } from '@/services/browse-landings';

/**
 * Crawlable links to every /shop/<slug> browse landing.
 *
 * WHY THIS EXISTS
 * The landing pages were generated, given canonicals, and listed in the
 * sitemap — but nothing linked to them except a single mention inside a couple
 * of guide articles. Search Console reported them under "Discovered –
 * currently not indexed": Google had found the URLs and decided they were not
 * worth crawling.
 *
 * That is a reasonable conclusion for a page with no inbound links. A sitemap
 * says "this URL exists"; internal links say "this URL matters". Only the
 * second one competes for crawl budget, and internal linking is the one
 * authority signal entirely within our control.
 *
 * WHAT THIS IS NOT
 * It will not on its own get 73 pages indexed. It removes an obstacle — it
 * does not manufacture the site authority that actually decides crawl budget.
 *
 * The list is derived from the catalogue via getBrowseLandings(), never
 * hardcoded: the same rule that stops a landing page existing below
 * MIN_PRODUCTS also stops a dead link appearing here. A taxonomy typed out by
 * hand goes stale the moment a product is recategorised, and links to
 * zero-result pages are worse than no links at all.
 */
export default async function BrowseLandingLinks({
  heading = 'Browse by category and fabric',
  className = '',
}: {
  heading?: string;
  className?: string;
}) {
  const landings = await getBrowseLandings();

  // A sparse catalogue is an acceptable outcome — render nothing rather than
  // an empty section with a heading over it.
  if (landings.length === 0) return null;

  return (
    <section
      className={className}
      aria-labelledby="browse-landings-heading"
      style={{ borderTop: '1px solid var(--bc-border)', paddingTop: 'var(--bc-space-8)' }}
    >
      <h2
        id="browse-landings-heading"
        className="mb-1 font-normal"
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
          fontSize: 'var(--bc-lg)',
          color: 'var(--bc-text-rich)',
        }}
      >
        {heading}
      </h2>
      <span className="bc-rule mb-6 block" aria-hidden="true" />

      {/*
        Real anchors, not buttons or router.push handlers. A crawler follows
        <a href>; it does not click. This whole component is pointless if the
        links are not traversable without JavaScript.
      */}
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {landings.map((l) => (
          <li key={l.slug}>
            <Link
              href={`/shop/${l.slug}`}
              className="inline-block px-3 py-1.5 transition-colors"
              style={{
                border: '1px solid var(--bc-border)',
                fontSize: 'var(--bc-sm)',
                color: 'var(--bc-text-mid)',
              }}
            >
              {l.heading}
              {/* The count is real and queried, never decorative. */}
              <span style={{ color: 'var(--bc-text-faint)' }}> ({l.count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
