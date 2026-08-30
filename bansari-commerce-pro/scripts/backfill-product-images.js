/**
 * One-off backfill: re-encode oversized product images already in Supabase.
 *
 * Context: the catalogue was measured at 431MB across 207 images, 394MB of it
 * PNG. Image optimisation is bypassed (next.config.ts), so those bytes reach
 * visitors unmodified. compress-image.ts fixes new uploads; this fixes the
 * backlog.
 *
 * SAFETY
 * - Dry run by default. Pass --apply to write.
 * - Originals are NEVER deleted. The JPEG is uploaded alongside under a new
 *   key, and the product row is repointed. Rollback = restore the old URLs.
 * - Idempotent: images already JPEG under the size floor are skipped, so it is
 *   safe to re-run.
 * - Writes a rollback manifest (image-backfill-manifest.json) mapping every new
 *   URL back to the original before any DB row is touched.
 *
 * Usage:
 *   node scripts/backfill-product-images.js            # dry run, changes nothing
 *   node scripts/backfill-product-images.js --apply    # performs the migration
 *   node scripts/backfill-product-images.js --limit 5  # only first N products
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'product-images';
const MAX_EDGE = 2000;
/** Kept in step with QUALITY in src/lib/compress-image.ts — see the note there. */
const QUALITY = 90;
/** Leave anything already this small alone — not worth a rewrite. */
const SIZE_FLOOR = 400 * 1024;
const MANIFEST = 'image-backfill-manifest.json';

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const mb = (n) => (n / 1048576).toFixed(2);

/** Storage object key from a public URL, or null if not in our bucket. */
function keyFromUrl(u) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = u.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(u.slice(i + marker.length));
}

(async () => {
  const { data: products, error } = await db
    .from('products')
    .select('id, name, images')
    .order('id');
  if (error) {
    console.error('Could not read products:', error.message);
    if (/Legacy API keys/i.test(error.message)) {
      console.error('\n-> .env.local holds the disabled legacy keys. Replace');
      console.error('   SUPABASE_SERVICE_ROLE_KEY with the new secret key (sb_secret_...)');
      console.error('   from the Supabase dashboard: Settings -> API Keys.');
    }
    // Set the code and return rather than process.exit(): sharp holds native
    // handles, and an abrupt exit trips a libuv assertion on Windows.
    process.exitCode = 1;
    return;
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${products.length} products\n`);

  const manifest = [];
  let before = 0;
  let after = 0;
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of products.slice(0, LIMIT)) {
    const images = Array.isArray(p.images) ? p.images : [];
    let rowChanged = false;
    const nextImages = [];

    for (const img of images) {
      // Videos and anything outside our bucket pass through untouched.
      const objKey = typeof img?.url === 'string' ? keyFromUrl(img.url) : null;
      if (!objKey || img.mediaType === 'video') {
        nextImages.push(img);
        continue;
      }

      const { data: blob, error: dErr } = await db.storage.from(BUCKET).download(objKey);
      if (dErr) {
        console.log(`  #${p.id} ${objKey}: download failed (${dErr.message})`);
        nextImages.push(img);
        failed++;
        continue;
      }

      const input = Buffer.from(await blob.arrayBuffer());
      if (input.length < SIZE_FLOOR && /\.jpe?g$/i.test(objKey)) {
        nextImages.push(img);
        skipped++;
        continue;
      }

      let output;
      try {
        output = await sharp(input)
          .rotate() // honour EXIF before stripping it
          .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
          .toBuffer();
      } catch (e) {
        console.log(`  #${p.id} ${objKey}: encode failed (${e.message})`);
        nextImages.push(img);
        failed++;
        continue;
      }

      if (output.length >= input.length) {
        nextImages.push(img);
        skipped++;
        continue;
      }

      const newKey = objKey.replace(/\.[^.]+$/, '') + '-c.jpg';
      before += input.length;
      after += output.length;
      converted++;

      console.log(
        `  #${String(p.id).padStart(3)} ${mb(input.length)}M -> ${mb(output.length)}M  ${objKey.slice(0, 52)}`
      );

      if (APPLY) {
        const { error: uErr } = await db.storage
          .from(BUCKET)
          .upload(newKey, output, { contentType: 'image/jpeg', upsert: true });
        if (uErr) {
          console.log(`  #${p.id} ${newKey}: upload failed (${uErr.message})`);
          nextImages.push(img);
          failed++;
          continue;
        }
      }

      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(newKey);
      manifest.push({ productId: p.id, oldUrl: img.url, newUrl: pub.publicUrl, oldKey: objKey });
      nextImages.push({ ...img, url: pub.publicUrl });
      rowChanged = true;
    }

    if (rowChanged && APPLY) {
      // Manifest is flushed before the row changes, so a crash mid-run is recoverable.
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
      const { error: upErr } = await db.from('products').update({ images: nextImages }).eq('id', p.id);
      if (upErr) console.log(`  #${p.id}: DB update failed (${upErr.message})`);
    }
  }

  if (manifest.length) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log('\n' + '-'.repeat(60));
  console.log(`converted ${converted}   skipped ${skipped}   failed ${failed}`);
  console.log(`${mb(before)}M -> ${mb(after)}M` + (before ? `  (-${(100 * (1 - after / before)).toFixed(1)}%)` : ''));
  console.log(APPLY ? `manifest written to ${MANIFEST}` : '\nDRY RUN — nothing was written. Re-run with --apply.');
})();
