/**
 * Re-encode the catalogue from the ORIGINAL sources to JPEG q90 4:4:4.
 *
 * WHY
 * The first backfill used JPEG q90 with default 4:2:0 chroma subsampling, which
 * throws away three quarters of the colour resolution. That is precisely the
 * detail that matters here — zari, embroidery thread, fine woven colour.
 * Measured over four originals (RGB mean abs error vs source):
 *
 *   q90 4:2:0  431KB  err 2.51   <- what is live now
 *   q90 4:4:4  582KB  err 2.11
 *
 * CRITICAL: this reads the ORIGINAL file recorded in the manifest, never the
 * live -c.jpg. Re-encoding the current JPEG would stack a second lossy pass and
 * make things worse, not better.
 *
 * Writes to a new -c444.jpg key and repoints the row, so the previous JPEG and
 * the original both remain for rollback.
 *
 * Usage:
 *   node scripts/reencode-444.js              # dry run
 *   node scripts/reencode-444.js --apply
 *   node scripts/reencode-444.js --limit 3
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'product-images';
const QUALITY = 90;
const MANIFEST = 'image-backfill-manifest.json';
const OUT_MANIFEST = 'image-444-manifest.json';
const SUFFIX = '-c444.jpg';

const APPLY = process.argv.includes('--apply');
const li = process.argv.indexOf('--limit');
const LIMIT = li > -1 ? Number(process.argv[li + 1]) : Infinity;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const mb = (n) => (n / 1048576).toFixed(2);

(async () => {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`${MANIFEST} not found — it maps each live image back to its original.`);
    process.exitCode = 1;
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  // Group by product so each row is written once.
  const byProduct = new Map();
  for (const e of manifest) {
    if (!byProduct.has(e.productId)) byProduct.set(e.productId, []);
    byProduct.get(e.productId).push(e);
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${manifest.length} images across ${byProduct.size} products\n`);

  const out = [];
  let before = 0, after = 0, done = 0, skipped = 0, failed = 0;

  for (const [productId, entries] of [...byProduct].slice(0, LIMIT)) {
    const { data: product, error } = await db
      .from('products').select('id, images').eq('id', productId).single();
    if (error) { console.log(`  #${productId}: read failed (${error.message})`); failed++; continue; }

    let images = product.images;
    let rowChanged = false;

    for (const e of entries) {
      // Product 1's original lived in public/, not storage. Its compressed copy
      // was moved into the bucket already; there is no original to go back to.
      if (!/^[\w.-]+\.(png|jpe?g|webp)$/i.test(e.oldKey)) {
        skipped++;
        continue;
      }

      const { data: blob, error: dErr } = await db.storage.from(BUCKET).download(e.oldKey);
      if (dErr) { console.log(`  #${productId} ${e.oldKey}: download failed`); failed++; continue; }
      const src = Buffer.from(await blob.arrayBuffer());

      let buf;
      try {
        buf = await sharp(src)
          .rotate()
          .flatten({ background: '#ffffff' })
          .jpeg({
            quality: QUALITY,
            mozjpeg: true,
            progressive: true,
            chromaSubsampling: '4:4:4', // the whole point of this pass
          })
          .toBuffer();
      } catch (err) { console.log(`  #${productId} ${e.oldKey}: encode failed`); failed++; continue; }

      const newKey = e.oldKey.replace(/\.[^.]+$/, '') + SUFFIX;
      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(newKey);

      // Only rewrite the entry still pointing at the previous -c.jpg.
      const idx = images.findIndex((i) => i.url === e.newUrl);
      if (idx === -1) { skipped++; continue; }

      before += src.length;
      after += buf.length;
      done++;

      if (APPLY) {
        const { error: uErr } = await db.storage
          .from(BUCKET).upload(newKey, buf, { contentType: 'image/jpeg', upsert: true });
        if (uErr) { console.log(`  #${productId} ${newKey}: upload failed (${uErr.message})`); failed++; continue; }
      }

      images = images.map((im, k) => (k === idx ? { ...im, url: pub.publicUrl } : im));
      out.push({ productId, originalKey: e.oldKey, previousUrl: e.newUrl, newUrl: pub.publicUrl });
      rowChanged = true;
    }

    if (rowChanged) {
      console.log(`  #${String(productId).padStart(3)} ${entries.length} images`);
      if (APPLY) {
        fs.writeFileSync(OUT_MANIFEST, JSON.stringify(out, null, 2));
        const { error: upErr } = await db.from('products').update({ images }).eq('id', productId);
        if (upErr) console.log(`  #${productId}: DB update failed (${upErr.message})`);
      }
    }
  }

  // Only on --apply — see the same fix in backfill-product-images.js.
  if (APPLY && out.length) fs.writeFileSync(OUT_MANIFEST, JSON.stringify(out, null, 2));

  console.log('\n' + '-'.repeat(60));
  console.log(`re-encoded ${done}   skipped ${skipped}   failed ${failed}`);
  console.log(`from originals ${mb(before)}M -> ${mb(after)}M`);
  console.log(APPLY ? `manifest: ${OUT_MANIFEST}` : '\nDRY RUN — nothing written. Re-run with --apply.');
})();
