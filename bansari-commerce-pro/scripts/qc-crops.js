/**
 * Quality control for the JPEG re-encode: compare original vs compressed at
 * 100% pixel scale, plus a numeric difference.
 *
 * Both sides are resized to 2000px first, so the comparison isolates JPEG
 * artefacts rather than measuring the downscale.
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const KEY = process.argv[2];
const CROP = 700;

(async () => {
  const { data, error } = await db.storage.from('product-images').download(KEY);
  if (error) { console.log('ERR', error.message); return; }
  const buf = Buffer.from(await data.arrayBuffer());

  // Reference: the same resize, no lossy step.
  const ref = await sharp(buf)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .toBuffer();

  // Candidate: exactly what the backfill would store.
  const jpg = await sharp(buf)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toBuffer();

  const meta = await sharp(ref).metadata();
  // Centre-ish crop, where the garment detail lives.
  const left = Math.max(0, Math.round(meta.width / 2 - CROP / 2));
  const top = Math.max(0, Math.round(meta.height * 0.42 - CROP / 2));
  const region = { left, top, width: Math.min(CROP, meta.width), height: Math.min(CROP, meta.height) };

  await sharp(ref).extract(region).png().toFile('qc-a-original.png');
  await sharp(jpg).extract(region).png().toFile('qc-b-compressed.png');

  // Numeric difference over the whole image, on raw greyscale.
  const [ra, rb] = await Promise.all([
    sharp(ref).greyscale().raw().toBuffer(),
    sharp(jpg).greyscale().raw().toBuffer(),
  ]);
  let sum = 0, max = 0, over8 = 0;
  for (let i = 0; i < ra.length; i++) {
    const d = Math.abs(ra[i] - rb[i]);
    sum += d; if (d > max) max = d; if (d > 8) over8++;
  }
  const mean = sum / ra.length;
  const psnr = 10 * Math.log10(255 * 255 / Math.max(sum / ra.length ** 0, 1e-9) ** 0 || 1);

  console.log(`key            ${KEY.slice(0, 60)}`);
  console.log(`dimensions     ${meta.width}x${meta.height}`);
  console.log(`jpeg bytes     ${(jpg.length / 1048576).toFixed(2)}M  (source ${(buf.length / 1048576).toFixed(2)}M)`);
  console.log(`mean abs diff  ${mean.toFixed(2)} / 255   (under ~1.0 = imperceptible)`);
  console.log(`max abs diff   ${max} / 255`);
  console.log(`pixels >8 diff ${(100 * over8 / ra.length).toFixed(2)}%`);
  console.log(`crop region    ${region.width}x${region.height} at ${left},${top}`);
})();
