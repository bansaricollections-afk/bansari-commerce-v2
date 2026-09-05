import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { detectImageType } from '@/lib/image-signature';

/**
 * Generate responsive WebP variants for a freshly uploaded product image.
 *
 * WHY THIS EXISTS — it is a correctness requirement, not an optimisation.
 *
 * `next.config.ts` uses a custom image loader (src/lib/image-loader.ts) that
 * rewrites every Supabase product-image URL to `<base>-w<WIDTH>.webp`. The
 * loader cannot check whether that file exists — it is a pure, synchronous URL
 * transform that also runs in the browser. So if an image is uploaded and no
 * variants are generated, every reference to it 404s and the product shows a
 * broken image.
 *
 * The backfill script (scripts/generate-webp-variants.js) covered the 311
 * images referenced when the loader was switched on. This route keeps that
 * invariant true for everything uploaded afterwards, and must be called after
 * each successful upload.
 *
 * Kept server-side because sharp cannot run in the browser, and because the
 * service-role key must never reach the client.
 */

/** Must match WIDTHS in scripts/generate-webp-variants.js and the loader. */
const WIDTHS = [400, 800, 1200];
const QUALITY = 90;
const BUCKET = 'product-images';
const ONE_YEAR = '31536000';

/** Encoding several 1200px variants is slow; give it room. */
export const maxDuration = 60;

const variantKey = (key: string, w: number) =>
  key.replace(/\.[^.]+$/, '') + `-w${w}.webp`;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Writes to storage with the service-role key — admin only, same as every
  // other route under /api/admin.
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let keys: string[];
  try {
    const body = await request.json();
    keys = Array.isArray(body?.keys) ? body.keys : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (keys.length === 0) {
    return NextResponse.json({ error: 'No keys supplied' }, { status: 400 });
  }
  // Bound the work per request so one call cannot tie up a function slot.
  if (keys.length > 12) {
    return NextResponse.json({ error: 'Too many keys (max 12)' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const created: string[] = [];
  const failed: string[] = [];

  for (const rawKey of keys) {
    // Only raster images have variants; videos and GIFs are served as uploaded.
    if (typeof rawKey !== 'string' || !/\.(jpe?g|png)$/i.test(rawKey)) continue;

    /*
     * Reject anything that could escape the bucket root. The key comes from the
     * admin client, but it is still user-influenced input being turned into a
     * storage path.
     */
    if (rawKey.includes('..') || rawKey.startsWith('/')) {
      failed.push(rawKey);
      continue;
    }

    const { data: blob, error: dErr } = await db.storage.from(BUCKET).download(rawKey);
    if (dErr || !blob) { failed.push(rawKey); continue; }

    const src = Buffer.from(await blob.arrayBuffer());

    /*
     * Confirm the stored object really is an image before handing it to sharp.
     * Product images are uploaded straight from the browser to Supabase, so the
     * only type check on that path is the client's own — this is the first
     * server-side look at the actual bytes. sharp is a native library; feeding
     * it arbitrary attacker-supplied data is exactly the shape of the libvips
     * CVEs patched in this same batch.
     */
    if (!detectImageType(new Uint8Array(src.subarray(0, 32)))) {
      failed.push(rawKey);
      continue;
    }

    for (const w of WIDTHS) {
      try {
        /*
         * `withoutEnlargement` caps output at the source width, so a narrow
         * source still produces a file at every name the loader can request —
         * the name is a slot size, not a promise about pixel width. Nothing is
         * ever upscaled.
         */
        const buf = await sharp(src)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY, effort: 5 })
          .toBuffer();

        const { error: uErr } = await db.storage
          .from(BUCKET)
          .upload(variantKey(rawKey, w), buf, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: ONE_YEAR,
          });

        if (uErr) failed.push(variantKey(rawKey, w));
        else created.push(variantKey(rawKey, w));
      } catch {
        failed.push(variantKey(rawKey, w));
      }
    }
  }

  return NextResponse.json({ created: created.length, failed });
}
