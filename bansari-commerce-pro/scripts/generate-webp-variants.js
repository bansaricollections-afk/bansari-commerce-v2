/**
 * Generate responsive WebP variants for every product image.
 *
 * WHY
 * The site currently sends ONE full-size JPEG to every device. Measured against
 * House of Chikankari and House of Masaba (both Shopify), serving the same
 * photograph:
 *
 *              375px slot   750px slot   1500px slot   cache
 *   Chikankari    40 KB        120 KB       132 KB     1 year
 *   Masaba        14 KB         31 KB        25 KB     1 year
 *   Bansari      340 KB        340 KB       340 KB     1 hour
 *
 * They are not using lower-quality images — at full 1500px they ship 132 KB to
 * our 340 KB. The difference is (a) width variants chosen per device, (b) WebP
 * instead of JPEG, (c) a one-year cache. All three preserve quality exactly.
 *
 * This script produces all three: it resizes, encodes WebP, and sets a
 * one-year cacheControl on upload. Existing objects carry `max-age=3600`,
 * which is far too short for immutable content and is what PageSpeed's
 * "efficient cache lifetimes" audit is complaining about.
 *
 * COVERAGE IS A CORRECTNESS REQUIREMENT
 * The image loader (src/lib/image-loader.ts) rewrites EVERY Supabase product
 * image URL to `<base>-w<WIDTH>.webp`. It is a pure synchronous URL transform
 * that also runs in the browser, so it cannot check whether the target exists.
 * If an image has no variants, it 404s everywhere it appears.
 *
 * Therefore: this script covers every image on every product, active or not,
 * and /api/admin/images/variants covers everything uploaded afterwards. Verify
 * coverage before relying on the loader — never assume it.
 *
 * Usage:
 *   node scripts/generate-webp-variants.js            # dry run
 *   node scripts/generate-webp-variants.js --apply
 *   node scripts/generate-webp-variants.js --apply --limit 20
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

const APPLY = process.argv.includes('--apply');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

const BUCKET = 'product-images';

/*
 * Widths chosen from the layout, not from a generic breakpoint list:
 *   400  — homepage/shop card on a phone (displayed 335-420px)
 *   800  — card at 2x DPR, and the desktop card slot (507-560px)
 *   1200 — product page main image and the guide hero at 2x
 * A fourth width would add ~25% more storage for a size no slot requests.
 */
const WIDTHS = [400, 800, 1200];

/*
 * QUALITY 90, chosen by measurement rather than by convention.
 *
 * Each variant was compared against the original downscaled to the same width
 * (i.e. what the browser actually displays), scoring PSNR:
 *
 *   q=82   135 KB   35.8 dB   3.6x smaller
 *   q=86   164 KB   37.0 dB   3.0x
 *   q=90   209 KB   38.6 dB   2.3x     <- chosen
 *   q=94   272 KB   40.0 dB   1.8x
 *
 * The brief is that image quality must not be compromised, and there is a
 * large byte budget to spend: even at q=90 the whole catalogue is an order of
 * magnitude lighter than before, because the saving comes from serving the
 * right WIDTH, not from crushing the image. q=82 was measurably softer for a
 * saving that does not matter at these sizes.
 */
const QUALITY = 90;
const ONE_YEAR = '31536000';
/** Overwrite variants that already exist (use after changing QUALITY/WIDTHS). */
const FORCE = process.argv.includes('--force');

/**
 * Every raster image referenced by a live product gets variants.
 *
 * An earlier version restricted this to the `-c444` compressed convention so
 * that the loader could treat the filename as a coverage manifest. That left
 * 103 of 311 referenced images — a third of the catalogue, including the
 * homepage LCP image — still serving full-size JPEG. Covering everything and
 * generating variants at upload time (see the admin upload route) is both
 * simpler and complete.
 */
const ELIGIBLE = /\.(jpe?g|png)$/i;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const variantKey = (key, w) => key.replace(/\.[^.]+$/, '') + `-w${w}.webp`;

async function listAll() {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list('', { limit: 1000, offset });
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  console.log(APPLY ? 'APPLY\n' : 'DRY RUN — nothing will be written\n');

  const files = await listAll();
  const existing = new Set(files.map((f) => f.name));

  /*
   * EVERY product, not just active ones.
   *
   * An earlier version filtered on `active = true`, which left 9 images on 3
   * inactive products without variants. Because the image loader rewrites URLs
   * unconditionally, reactivating any of those products — or simply opening it
   * in the admin — would render broken images with no obvious cause. The
   * storage cost of covering them is trivial next to that failure mode.
   */
  const { data: products, error } = await db.from('products').select('id, images');
  if (error) throw new Error(error.message);

  const referenced = new Set();
  for (const p of products ?? []) {
    for (const img of p.images ?? []) {
      const url = typeof img === 'string' ? img : img?.url;
      if (!url) continue;
      const key = decodeURIComponent(url.split(`/${BUCKET}/`)[1] ?? '');
      if (key) referenced.add(key);
    }
  }

  const eligible = [...referenced].filter((k) => ELIGIBLE.test(k));
  const notEligible = [...referenced].filter((k) => !ELIGIBLE.test(k));

  console.log(`referenced by ALL products      : ${referenced.size}`);
  console.log(`eligible (jpg/png)            : ${eligible.length}`);
  if (notEligible.length) {
    console.log(`skipped (not a raster image)  : ${notEligible.length}`);
    notEligible.slice(0, 4).forEach((k) => console.log('   ', k.slice(0, 70)));
  }
  console.log('');

  let made = 0, skipped = 0, failed = 0, bytesIn = 0, bytesOut = 0;
  let processed = 0;

  for (const key of eligible) {
    if (processed >= LIMIT) break;
    processed++;

    const missing = FORCE ? WIDTHS : WIDTHS.filter((w) => !existing.has(variantKey(key, w)));
    if (missing.length === 0) { skipped += WIDTHS.length; continue; }

    const { data: blob, error: dErr } = await db.storage.from(BUCKET).download(key);
    if (dErr || !blob) { console.log(`  download failed: ${key}`); failed++; continue; }
    const src = Buffer.from(await blob.arrayBuffer());

    let meta;
    try { meta = await sharp(src).metadata(); }
    catch { console.log(`  unreadable: ${key}`); failed++; continue; }

    for (const w of missing) {
      /*
       * Every width is ALWAYS written, even when the source is narrower.
       *
       * `withoutEnlargement` below caps the output at the source width, so a
       * 1023px source produces a 1023px file named `-w1200.webp`. The name is a
       * SLOT SIZE, not a promise about pixel width — nothing is ever upscaled
       * or softened.
       *
       * Skipping these was a real bug: the loader picks the smallest variant
       * >= the requested width and falls back to the largest, so a wide slot
       * would request `-w1200.webp` for a source that never got one and 404.
       * That is precisely the failure that broke the storefront the last time
       * image handling changed here, so the invariant is: if the loader can
       * ask for a width, that file exists.
       */
      let buf;
      try {
        buf = await sharp(src)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY, effort: 5 })
          .toBuffer();
      } catch { console.log(`  encode failed: ${key} @${w}`); failed++; continue; }

      bytesIn += src.length / missing.length;
      bytesOut += buf.length;

      if (APPLY) {
        const { error: uErr } = await db.storage.from(BUCKET).upload(variantKey(key, w), buf, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: ONE_YEAR, // the fix for `no-cache` on every object
        });
        if (uErr) { console.log(`  upload failed: ${variantKey(key, w)} — ${uErr.message}`); failed++; continue; }
      }
      made++;
    }

    if (processed % 25 === 0) console.log(`  ...${processed}/${eligible.length} sources`);
  }

  console.log('\n' + '-'.repeat(64));
  console.log(`${APPLY ? 'created' : 'would create'} ${made} variants   skipped ${skipped}   failed ${failed}`);
  if (made) {
    console.log(`source bytes read : ${(bytesIn / 1048576).toFixed(1)} MB`);
    console.log(`variant bytes out : ${(bytesOut / 1048576).toFixed(1)} MB`);
    console.log(`avg variant size  : ${(bytesOut / made / 1024).toFixed(0)} KB`);
  }
  if (!APPLY) console.log('\nRe-run with --apply to write.');
})();
