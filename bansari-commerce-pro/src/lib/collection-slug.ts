/**
 * Collection slug helpers.
 *
 * `products.collection` stores a display string ("SUMMER 2026", "Festive Edit")
 * and /shop matches it verbatim. A landing page needs a URL-safe slug, so the
 * two are derived from each other here rather than in three separate places.
 *
 * Deriving slugs from the PRODUCT values, not the `collections` table, is
 * deliberate. The two have drifted: the table lists `bridal-collection` and
 * `sale`, which contain no products, while products carry "SUMMER 2026" and
 * "Celebration Edit", which have no table row. Building pages from the table
 * would publish two empty pages and miss two real ones — the table is used only
 * to enrich a page that already has products.
 */

/** "SUMMER 2026" -> "summer-2026". Mirrors slugify() used elsewhere. */
export function collectionSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a URL slug back to the exact stored collection string.
 * Returns null when no live collection matches, so the caller can 404 rather
 * than render an empty page.
 */
export function resolveCollectionSlug(
  slug: string,
  liveCollections: string[]
): string | null {
  const target = slug.toLowerCase();
  return liveCollections.find((name) => collectionSlug(name) === target) ?? null;
}
