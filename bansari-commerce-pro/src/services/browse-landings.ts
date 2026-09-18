/**
 * Browse landing pages — the indexable /shop/<slug> URLs.
 *
 * WHY THESE EXIST
 * /shop?category=… and /shop?fabric=… carry the shop page's own canonical
 * (/shop), so a filtered view can never rank. Search demand in this niche is
 * for exactly those phrases — "cotton kurta set", "linen co-ord set" — so each
 * viable filter gets a real URL with its own canonical, title and H1.
 *
 * WHY THE LIST IS SHORT
 * A landing page is only generated where the filter returns at least
 * MIN_PRODUCTS. Emitting a page per filter combination would produce dozens of
 * near-empty pages — "Mint Crepe Tops" with one product — which Google treats
 * as doorway pages and penalises. A thin page is worse than no page, so the
 * threshold is a hard gate rather than a preference.
 *
 * Everything is derived from the live catalogue. Nothing here is a hardcoded
 * taxonomy that can rot when the catalogue changes: if Linen drops below the
 * threshold its page stops being generated and leaves the sitemap.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { cache } from 'react';
import { getAttributeIndex } from '@/services/product-attributes';

/**
 * Minimum products for a landing page to be worth generating.
 *
 * Four is a judgement call: enough that the grid does not look broken and the
 * page says something a shopper could not get from /shop, low enough that a
 * 42-product catalogue can support a useful number of pages.
 */
export const MIN_PRODUCTS = 4;

/**
 * Attribute values that clear MIN_PRODUCTS but must never become a page.
 *
 * 'Plain' is the largest single Work bucket — 21 products — and the worst
 * possible landing page. It describes the ABSENCE of embellishment, nobody
 * searches "plain kurti", and "Plain Dresses" as a heading reads as a
 * criticism of the dresses. The threshold guards against thin pages; this
 * guards against pages that are well-stocked and still worthless.
 */
const EXCLUDED_VALUES = new Set(['plain']);

const isExcluded = (value: string) => EXCLUDED_VALUES.has(value.trim().toLowerCase());

export type BrowseLanding = {
  slug: string;
  /** H1 and title, e.g. "Cotton Kurta Sets". */
  heading: string;
  /** Filters handed to getFilteredProducts — must match /shop's own semantics. */
  filter: { category?: string; fabric?: string; occasion?: string; work?: string };
  count: number;
  /** Drives the intro sentence; no editorial copy is invented per page. */
  kind:
    | 'category'
    | 'fabric'
    | 'fabric-category'
    | 'occasion'
    | 'occasion-category'
    | 'work'
    | 'work-category';
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build the landing set from live product rows.
 *
 * React-cached so the route, generateStaticParams, generateMetadata and the
 * sitemap share a single query per request.
 */
export const getBrowseLandings = cache(async function getBrowseLandings(): Promise<
  BrowseLanding[]
> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('products')
      .select('category, fabric, attr_occasion_id, attr_work_id')
      .eq('active', true);

    if (error || !data) return [];

    /*
     * Occasion and work live in lookup tables, so their labels are resolved
     * once here rather than joined per row.
     */
    const attributes = await getAttributeIndex();

    const categories = new Map<string, number>();
    const fabrics = new Map<string, number>();
    const occasions = new Map<string, number>();
    const works = new Map<string, number>();
    const combos = new Map<string, { category: string; fabric: string; count: number }>();
    const occasionCombos = new Map<string, { category: string; occasion: string; count: number }>();
    const workCombos = new Map<string, { category: string; work: string; count: number }>();

    const bump = <T>(map: Map<string, T & { count: number }>, key: string, make: () => T) => {
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { ...make(), count: 1 } as T & { count: number });
    };

    type Row = {
      category: string | null;
      fabric: string | null;
      attr_occasion_id: number | null;
      attr_work_id: number | null;
    };

    for (const row of data as Row[]) {
      const { category, fabric } = row;
      const occasion =
        typeof row.attr_occasion_id === 'number'
          ? attributes.attr_occasion.get(row.attr_occasion_id) ?? null
          : null;
      const work =
        typeof row.attr_work_id === 'number'
          ? attributes.attr_work.get(row.attr_work_id) ?? null
          : null;

      if (category) categories.set(category, (categories.get(category) ?? 0) + 1);
      if (fabric) fabrics.set(fabric, (fabrics.get(fabric) ?? 0) + 1);
      if (occasion && !isExcluded(occasion)) occasions.set(occasion, (occasions.get(occasion) ?? 0) + 1);
      if (work && !isExcluded(work)) works.set(work, (works.get(work) ?? 0) + 1);

      if (category && fabric) {
        bump(combos, `${fabric}|${category}`, () => ({ category, fabric }));
      }
      if (category && occasion && !isExcluded(occasion)) {
        bump(occasionCombos, `${occasion}|${category}`, () => ({ category, occasion }));
      }
      if (category && work && !isExcluded(work)) {
        bump(workCombos, `${work}|${category}`, () => ({ category, work }));
      }
    }

    const landings: BrowseLanding[] = [];

    for (const [category, count] of categories) {
      if (count < MIN_PRODUCTS) continue;
      landings.push({
        slug: slugify(category),
        heading: category,
        filter: { category },
        count,
        kind: 'category',
      });
    }

    for (const [fabric, count] of fabrics) {
      if (count < MIN_PRODUCTS) continue;
      landings.push({
        slug: slugify(fabric),
        heading: `${fabric} Ethnic Wear`,
        filter: { fabric },
        count,
        kind: 'fabric',
      });
    }

    for (const { category, fabric, count } of combos.values()) {
      if (count < MIN_PRODUCTS) continue;
      const heading = `${fabric} ${category}`;
      const slug = slugify(heading);
      // A combo whose slug collides with a category or fabric page adds nothing.
      if (landings.some((l) => l.slug === slug)) continue;
      landings.push({ slug, heading, filter: { category, fabric }, count, kind: 'fabric-category' });
    }

    /*
     * Occasion pages. "festive kurta set" is a phrase people genuinely type in
     * this market, in a way "v-neck kurta" is not — which is why occasion and
     * work are the two attribute dimensions promoted to pages and the other
     * six (neckline, sleeve, length, fit, pattern, colour) are not.
     */
    for (const [occasion, count] of occasions) {
      if (count < MIN_PRODUCTS) continue;
      const heading = `${occasion} Wear`;
      const slug = slugify(heading);
      if (landings.some((l) => l.slug === slug)) continue;
      landings.push({ slug, heading, filter: { occasion }, count, kind: 'occasion' });
    }

    for (const [work, count] of works) {
      if (count < MIN_PRODUCTS) continue;
      const slug = slugify(work);
      if (landings.some((l) => l.slug === slug)) continue;
      landings.push({ slug, heading: work, filter: { work }, count, kind: 'work' });
    }

    for (const { category, occasion, count } of occasionCombos.values()) {
      if (count < MIN_PRODUCTS) continue;
      const heading = `${occasion} ${category}`;
      const slug = slugify(heading);
      if (landings.some((l) => l.slug === slug)) continue;
      landings.push({ slug, heading, filter: { category, occasion }, count, kind: 'occasion-category' });
    }

    for (const { category, work, count } of workCombos.values()) {
      if (count < MIN_PRODUCTS) continue;
      const heading = `${work} ${category}`;
      const slug = slugify(heading);
      if (landings.some((l) => l.slug === slug)) continue;
      landings.push({ slug, heading, filter: { category, work }, count, kind: 'work-category' });
    }

    // Biggest first, so generateStaticParams prerenders the most valuable first.
    return landings.sort((a, b) => b.count - a.count);
  } catch {
    // A landing-page failure must never take down /shop or the sitemap.
    return [];
  }
});

export async function findBrowseLanding(slug: string): Promise<BrowseLanding | null> {
  const landings = await getBrowseLandings();
  return landings.find((l) => l.slug === slug.toLowerCase()) ?? null;
}
