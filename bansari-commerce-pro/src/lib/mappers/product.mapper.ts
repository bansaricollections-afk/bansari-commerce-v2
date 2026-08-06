/**
 * product.mapper.ts
 *
 * Single source of truth for resolving product image URLs.
 *
 * Responsibilities:
 *   1. Normalise the `images` JSONB array from Supabase into the
 *      { url, alt, type } shape consumed by every storefront component.
 *   2. Fall back to `/placeholder-product.jpg` when no valid URL is present.
 *   3. Ensure `images[0]` is always the primary/hero image.
 *
 * Used by:
 *   - ProductService (every query function)
 *   - ProductCard, ProductInfo, FeaturedProducts, NewArrivals
 *
 * DO NOT add business logic here. This is a pure data-transformation layer.
 */

export type ProductImage = {
  url: string;
  alt: string;
  type?: string;
};

const PLACEHOLDER = '/placeholder-product.jpg';

/**
 * Normalise a single raw image entry from the DB `images` JSONB column.
 * Accepts:
 *   - { url, alt, type } — standard shape
 *   - { image_url, ... } — legacy shape written by older seed scripts
 *   - string — bare URL string
 */
function normaliseImage(
  raw: unknown,
  productName: string,
  index: number,
): ProductImage | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const url = raw.trim();
    if (!url) return null;
    return { url, alt: productName, type: index === 0 ? 'primary' : 'gallery' };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const url =
      (typeof obj['url'] === 'string' ? obj['url'] : '') ||
      (typeof obj['image_url'] === 'string' ? obj['image_url'] : '');

    if (!url.trim()) return null;

    return {
      url: url.trim(),
      alt:
        typeof obj['alt'] === 'string' && obj['alt'].trim()
          ? obj['alt'].trim()
          : productName,
      type:
        typeof obj['type'] === 'string' && obj['type'].trim()
          ? obj['type'].trim()
          : index === 0
          ? 'primary'
          : 'gallery',
    };
  }

  return null;
}

/**
 * resolveProductImages
 *
 * Takes the raw `images` value from a Supabase product row and returns a
 * clean, non-empty ProductImage[]. If no valid images are found, returns
 * a single-element array containing the branded placeholder.
 *
 * @param rawImages — value of `row.images` (may be null, [], or JSONB array)
 * @param productName — used as alt-text fallback
 */
export function resolveProductImages(
  rawImages: unknown,
  productName: string,
): ProductImage[] {
  const arr = Array.isArray(rawImages) ? rawImages : [];

  const resolved = arr
    .map((entry, i) => normaliseImage(entry, productName, i))
    .filter((img): img is ProductImage => img !== null);

  if (resolved.length === 0) {
    return [{ url: PLACEHOLDER, alt: productName, type: 'primary' }];
  }

  return resolved;
}
