/**
 * One-off: product 1 referenced /products/p1.png, a file in public/ rather than
 * Supabase storage. The backfill skipped it correctly (not a storage object),
 * and the public/ PNG re-encode renamed that file to p1.jpg — which would have
 * 404'd the image on deploy.
 *
 * Uploads the compressed copy to Supabase and repoints the row, so the product
 * no longer depends on a static file at all.
 *
 * Dry run by default; pass --apply to write. Appends to the backfill manifest.
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'product-images';
const SOURCE = 'public/products/p1.jpg'; // already re-encoded on this branch
const KEY = 'legacy-p1-c.jpg';
const MANIFEST = 'image-backfill-manifest.json';
const APPLY = process.argv.includes('--apply');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const buf = await sharp(SOURCE)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toBuffer();

  const { data: product, error } = await db
    .from('products').select('id, images').eq('id', 1).single();
  if (error) { console.error(error.message); process.exitCode = 1; return; }

  const target = product.images.find((i) => /\/products\/p1\.(png|jpg)$/i.test(i.url));
  if (!target) { console.log('No /products/p1.* reference on product 1 — nothing to do.'); return; }

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(KEY);
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`  from  ${target.url}`);
  console.log(`  to    ${pub.publicUrl}`);
  console.log(`  bytes ${(buf.length / 1024).toFixed(0)}KB`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  const { error: uErr } = await db.storage
    .from(BUCKET).upload(KEY, buf, { contentType: 'image/jpeg', upsert: true });
  if (uErr) { console.error('upload failed:', uErr.message); process.exitCode = 1; return; }

  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : [];
  manifest.push({ productId: 1, oldUrl: target.url, newUrl: pub.publicUrl, oldKey: 'public/products/p1.png' });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  const images = product.images.map((i) => (i === target ? { ...i, url: pub.publicUrl } : i));
  const { error: upErr } = await db.from('products').update({ images }).eq('id', 1);
  if (upErr) { console.error('DB update failed:', upErr.message); process.exitCode = 1; return; }

  console.log('done — product 1 repointed, manifest updated');
})();
