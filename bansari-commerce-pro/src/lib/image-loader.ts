/**
 * Custom image loader — free responsive images without Vercel's optimiser.
 *
 * THE PROBLEM THIS SOLVES
 * `unoptimized: true` was set in next.config.ts as an emergency when the Vercel
 * free tier's 5,000 monthly image transformations ran out and every uncached
 * variant started returning 402, breaking product images across the storefront.
 * The trade was that next/image began emitting a plain <img> pointing at the
 * full-size original — so a phone showing a card at 375px downloaded the same
 * ~340 KB file as a desktop showing it at 1200px.
 *
 * Measured against House of Chikankari and House of Masaba (both Shopify) on
 * the same photograph: they serve 40 KB and 14 KB respectively into a 375px
 * slot, and even at full 1500px they ship 132 KB against our 340 KB. They are
 * not using lower-quality images — they serve width-appropriate WebP with a
 * one-year cache.
 *
 * WHY A CUSTOM LOADER IS FREE
 * `images.loader: 'custom'` makes next/image build its `srcset` from THIS
 * function's return values. The URLs point straight at Supabase storage, so
 * nothing is routed through `/_next/image` and no billable transformation is
 * ever requested. We get Shopify's delivery model on the free tier, at the cost
 * of pre-generating the variants ourselves
 * (scripts/generate-webp-variants.js).
 *
 * FAILURE MODE
 * A URL is only rewritten when it is a Supabase product image whose variants we
 * generate. Anything else — local /public assets, an unrecognised host, an SVG,
 * a URL that already points at a variant — is returned untouched. That keeps
 * the blast radius small: an image we have not processed serves its original
 * file rather than 404-ing, which is the failure that broke the storefront the
 * last time image handling changed here.
 */

/** Must match WIDTHS in scripts/generate-webp-variants.js. */
const VARIANT_WIDTHS = [400, 800, 1200] as const;

/** Supabase public storage path for the catalogue bucket. */
const PRODUCT_IMAGE_PATH = '/storage/v1/object/public/product-images/';

/** Variants exist for these source types only. */
const RASTER = /\.(jpe?g|png)$/i;

/** A URL that is already a generated variant must never be rewritten again. */
const ALREADY_VARIANT = /-w\d+\.webp$/i;

type LoaderArgs = { src: string; width: number; quality?: number };

/**
 * Smallest generated width that still covers the requested width, so an image
 * is never upscaled into a slot. Falls back to the largest variant.
 */
function pickWidth(requested: number): number {
  return (
    VARIANT_WIDTHS.find((w) => w >= requested) ??
    VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]
  );
}

export default function supabaseImageLoader({ src, width }: LoaderArgs): string {
  // Relative/local assets (/logo-full.png, /placeholder.png) — leave alone.
  if (!src.startsWith('http')) return src;

  if (
    !src.includes(PRODUCT_IMAGE_PATH) ||
    ALREADY_VARIANT.test(src) ||
    !RASTER.test(src.split('?')[0])
  ) {
    return src;
  }

  const [path, query] = src.split('?');
  const variant = path.replace(/\.[^.]+$/, `-w${pickWidth(width)}.webp`);
  return query ? `${variant}?${query}` : variant;
}
