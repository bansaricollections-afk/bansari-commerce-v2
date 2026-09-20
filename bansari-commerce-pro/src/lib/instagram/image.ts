/**
 * Instagram image preparation — turn a product photo into something the
 * publishing API will actually accept.
 *
 * WHY THIS IS THE LOAD-BEARING PART
 * Instagram's content publishing API only accepts images whose aspect ratio
 * falls between 4:5 (0.8) and 1.91:1. A measurement of the live catalogue
 * found the shop's photography sits at:
 *
 *     0.800 (4:5)   — 6 of 15 products   accepted
 *     0.750 (3:4)   — 2 of 15 products   REJECTED
 *     0.667 (2:3)   — 7 of 15 products   REJECTED
 *
 * So nine of fifteen products could not be posted at all without this step.
 * The failure is not cosmetic: the create-container request errors and nothing
 * is published. Any integration that skips this works on some products and
 * mysteriously fails on most, which is the worst possible way to find out.
 *
 * WHY PAD AND NOT CROP
 * Cropping a 2:3 photo to 4:5 removes a quarter of its height. On a full-length
 * garment shot that is the hem, the feet, or the fall of a dupatta — precisely
 * the part a customer is judging. Nothing in the image tells us which end is
 * safe to cut, and guessing wrong is published permanently. Padding onto the
 * brand's own cream reads as deliberate editorial framing and cannot destroy
 * anything.
 *
 * WHY THE RESULT IS UPLOADED RATHER THAN STREAMED
 * Meta fetches the media itself: "we cURL media used in publishing attempts,
 * so the media must be hosted on a publicly accessible server". The bytes
 * cannot be posted to the API. They have to exist at a public URL first.
 */
import sharp from 'sharp';

import { createServiceRoleClient } from '@/lib/supabase/service';

/** --bc-cream / --bc-surface-cream. The site's own paper colour. */
const CREAM = { r: 255, g: 253, b: 249, alpha: 1 } as const;

/**
 * Instagram's accepted range. Anything outside is refused at container
 * creation, so these are hard limits and not a style preference.
 */
export const IG_MIN_RATIO = 0.8; // 4:5
export const IG_MAX_RATIO = 1.91; // 1.91:1

/**
 * The shape we pad to. 4:5 is the tallest Instagram allows — it gives a
 * portrait garment the most vertical room on screen, which is the whole
 * reason the original shoots are portrait.
 *
 * WHY 0.801 AND NOT 0.8
 * Aiming at exactly 4:5 lands on the wrong side of the limit through
 * rounding. A 1122px-wide photo wants a height of 1122 / 0.8 = 1402.5;
 * rounding that to 1403 yields a ratio of 0.7997, which is BELOW the floor,
 * and Instagram refuses it. That was measured, not theorised — it rejected
 * four of eight test images, including ones that were already valid 4:5
 * before being processed.
 *
 * Aiming a hair inside the boundary means integer rounding can never push the
 * result out of range, and it also avoids depending on whether Meta's own
 * comparison is inclusive at exactly 0.8. The difference is invisible: about
 * one pixel of extra cream on a 1400px image.
 */
const TARGET_RATIO = 0.801;

/** Meta scales anything above 1440px down, so sending more is wasted bytes. */
const MAX_WIDTH = 1440;

/** Meta's documented per-image ceiling is 8MB. Staying well under it leaves
 *  room for their re-encode and avoids arguing about boundary cases. */
const MAX_BYTES = 7 * 1024 * 1024;

export type PreparedImage = {
  /** Public URL of the 4:5 rendition, ready to hand to Meta. */
  url: string;
  /** What we did, so the admin UI can show it rather than silently altering
   *  the merchant's photography. */
  action: 'padded' | 'resized' | 'unchanged';
  sourceRatio: number;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Fit an image into a 4:5 frame without cropping.
 *
 * `fit: 'contain'` scales the image down until it fits inside the target box
 * and fills the remainder with `background`. It never enlarges beyond the
 * source and never cuts — which is the property that matters here.
 */
async function toInstagramFrame(input: Buffer): Promise<{ buf: Buffer; w: number; h: number }> {
  const meta = await sharp(input).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error('Could not read image dimensions');

  // Width is driven by the source, capped at Meta's ceiling. A portrait photo
  // narrower than 1440 is not upscaled: enlarging a photo to satisfy a limit
  // buys nothing but blur.
  const width = Math.min(srcW, MAX_WIDTH);

  // floor(), never round(): a taller frame lowers the ratio, and the ratio is
  // already aimed at the bottom of the accepted range.
  let height = Math.floor(width / TARGET_RATIO);

  // Belt and braces. Whatever the arithmetic produced, the emitted frame must
  // sit inside Instagram's range — this is the invariant the whole module
  // exists to guarantee, so it is asserted rather than assumed.
  while (height > 1 && width / height < IG_MIN_RATIO) height -= 1;
  if (width / height < IG_MIN_RATIO || width / height > IG_MAX_RATIO) {
    throw new Error(
      `Could not fit ${srcW}x${srcH} into Instagram's ${IG_MIN_RATIO}–${IG_MAX_RATIO} range`
    );
  }

  let quality = 90;
  let buf = await render(input, width, height, quality);

  // Step the quality down only as far as the size limit requires. Product
  // photography is the thing being sold; degrading it further than necessary
  // is a real cost, not a rounding error.
  while (buf.byteLength > MAX_BYTES && quality > 60) {
    quality -= 10;
    buf = await render(input, width, height, quality);
  }

  return { buf, w: width, h: height };
}

function render(input: Buffer, width: number, height: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .resize(width, height, { fit: 'contain', background: CREAM, withoutEnlargement: true })
    .flatten({ background: CREAM }) // PNG transparency would otherwise go black
    .toColorspace('srgb') // Meta converts anything else; doing it here keeps colour predictable
    .jpeg({ quality, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}

/**
 * Prepare one product image and publish it to storage at a public URL.
 *
 * `key` must be stable for a given (product, index) so re-previewing a post
 * overwrites the previous rendition instead of accumulating one file per
 * preview click.
 */
export async function prepareForInstagram(
  sourceUrl: string,
  key: string
): Promise<PreparedImage> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status}): ${sourceUrl}`);
  const original = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(original).metadata();
  const sourceRatio = (meta.width ?? 0) / (meta.height ?? 1);

  const { buf, w, h } = await toInstagramFrame(original);

  const withinRange = sourceRatio >= IG_MIN_RATIO && sourceRatio <= IG_MAX_RATIO;
  const action: PreparedImage['action'] = !withinRange
    ? 'padded'
    : (meta.width ?? 0) > MAX_WIDTH
      ? 'resized'
      : 'unchanged';

  const sb = createServiceRoleClient();
  const path = `instagram/${key}.jpg`;

  const { error } = await sb.storage.from('product-images').upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: true, // stable key + upsert = re-preview replaces, never accumulates
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = sb.storage.from('product-images').getPublicUrl(path);

  return {
    url: data.publicUrl,
    action,
    sourceRatio: Number(sourceRatio.toFixed(3)),
    width: w,
    height: h,
    bytes: buf.byteLength,
  };
}
