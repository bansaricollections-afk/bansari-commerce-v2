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

/**
 * Minimum products for a landing page to be worth generating.
 *
 * Four is a judgement call: enough that the grid does not look broken and the
 * page says something a shopper could not get from /shop, low enough that a
 * 42-product catalogue can support a useful number of pages.
 */
export const MIN_PRODUCTS = 4;

export type BrowseLanding = {
  slug: string;
  /** H1 and title, e.g. "Cotton Kurta Sets". */
  heading: string;
  /** Filters handed to getFilteredProducts — must match /shop's own semantics. */
  filter: { category?: string; fabric?: string };
  count: number;
  /** Drives the intro sentence; no editorial copy is invented per page. */
  kind: 'category' | 'fabric' | 'fabric-category';
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
      .select('category, fabric')
      .eq('active', true);

    if (error || !data) return [];

    const categories = new Map<string, number>();
    const fabrics = new Map<string, number>();
    const combos = new Map<string, { category: string; fabric: string; count: number }>();

    for (const row of data as { category: string | null; fabric: string | null }[]) {
      const { category, fabric } = row;
      if (category) categories.set(category, (categories.get(category) ?? 0) + 1);
      if (fabric) fabrics.set(fabric, (fabrics.get(fabric) ?? 0) + 1);
      if (category && fabric) {
        const key = `${fabric}|${category}`;
        const existing = combos.get(key);
        if (existing) existing.count += 1;
        else combos.set(key, { category, fabric, count: 1 });
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
