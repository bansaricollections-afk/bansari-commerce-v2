import Link from 'next/link';

import { getBrowseLandings, type BrowseLanding } from '@/services/browse-landings';

/**
 * "Shop By" — sitewide crawlable links to every browse landing page.
 *
 * WHY IT LIVES IN THE FOOTER
 * The landing pages already existed, had canonicals, and were listed in the
 * sitemap — and Search Console still reported them under "Discovered –
 * currently not indexed". BrowseLandingLinks put real anchors on /shop and
 * /collections, which helped, but those are two pages. A sitemap says a URL
 * exists; internal links say it matters, and the footer is the only place that
 * says it from every page on the site.
 *
 * WHAT THIS IS NOT
 * It does not manufacture authority, and it will not by itself get 73 pages
 * indexed. It removes the "nothing links here" obstacle. That is worth doing
 * and it is not a growth strategy.
 *
 * WHY IT IS NOT A LINK FARM
 * The reference for this section was a competitor footer carrying roughly
 * eighty links across six headings. They can support that: thousands of
 * products, every link landing on real inventory. This catalogue has 56 active
 * products, and getBrowseLandings() only emits a landing where the filter
 * returns MIN_PRODUCTS or more. So this block renders whatever the catalogue
 * genuinely supports — currently around ten links — and grows on its own as
 * the catalogue does. Padding it out with thin or zero-result URLs would spend
 * crawl budget telling Google about empty pages, which is the opposite of the
 * problem being solved here.
 *
 * Nothing is hardcoded. A recategorised product changes this block on the next
 * request, and a filter that drops below the threshold disappears from here,
 * from the sitemap and from generateStaticParams together.
 */

/** Groups in reading order. `kind` comes straight from getBrowseLandings(). */
const GROUPS: { kind: BrowseLanding['kind']; heading: string }[] = [
  { kind: 'category', heading: 'Shop by Category' },
  { kind: 'fabric', heading: 'Shop by Fabric' },
  { kind: 'fabric-category', heading: 'Shop by Fabric & Style' },
];

export default async function FooterShopBy() {
  const landings = await getBrowseLandings();

  // A sparse catalogue is an acceptable outcome: render nothing rather than
  // headings with nothing under them.
  if (landings.length === 0) return null;

  const groups = GROUPS.map((g) => ({
    ...g,
    items: landings.filter((l) => l.kind === g.kind),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div
      style={{
        borderTop: '1px solid var(--bc-border-dark)',
        paddingInline: 'var(--bc-gutter)',
        paddingBlock: 'var(--bc-space-12)',
      }}
    >
      <nav
        aria-labelledby="footer-shop-by-heading"
        className="mx-auto"
        style={{ maxWidth: 'var(--bc-content-wide)' }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--bc-space-8)' }}>
          <span
            aria-hidden
            className="block h-px w-8"
            style={{ backgroundColor: 'var(--bc-gold)' }}
          />
          <h2
            id="footer-shop-by-heading"
            style={{
              fontSize: 'var(--bc-text-xs)',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--bc-gold)',
            }}
          >
            Popular Searches
          </h2>
        </div>

        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <section key={group.kind}>
              <p
                style={{
                  fontSize: 'var(--bc-text-xs)',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--bc-text-inverse)',
                  opacity: 0.4,
                  marginBottom: 'var(--bc-space-4)',
                }}
              >
                {group.heading}
              </p>

              {/*
                Real anchors. A crawler follows <a href>; it does not click,
                and this component is pointless if the links need JavaScript.
              */}
              <ul className="flex flex-col" style={{ gap: 'var(--bc-space-2)' }}>
                {group.items.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/shop/${l.slug}`}
                      className="bc-footer-link"
                      style={{
                        fontSize: 'var(--bc-text-sm)',
                        color: 'var(--bc-text-inverse)',
                        opacity: 0.65,
                        textDecoration: 'none',
                        transition: 'opacity var(--bc-transition-base)',
                      }}
                    >
                      {l.heading}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
    </div>
  );
}
