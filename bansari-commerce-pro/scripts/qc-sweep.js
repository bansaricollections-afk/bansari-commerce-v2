/** Compare JPEG quality settings across a sample of real catalogue images. */
require('dotenv').config({ path: '.env.local', quiet: true });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const QUALITIES = [78, 82, 86, 90, 94];

(async () => {
  const { data: list } = await db.storage
    .from('product-images')
    .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  // Spread the sample across the bucket rather than taking the first few.
  const pngs = list.filter((o) => /\.png$/i.test(o.name));
  const step = Math.max(1, Math.floor(pngs.length / 6));
  const sample = pngs.filter((_, i) => i % step === 0).slice(0, 6);

  const totals = Object.fromEntries(QUALITIES.map((q) => [q, { bytes: 0, diff: 0, n: 0 }]));
  let sourceBytes = 0;

  for (const obj of sample) {
    const { data } = await db.storage.from('product-images').download(obj.name);
    const buf = Buffer.from(await data.arrayBuffer());
    sourceBytes += buf.length;

    const base = sharp(buf).rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' });

    const ref = await base.clone().greyscale().raw().toBuffer();

    for (const q of QUALITIES) {
      const enc = await base.clone().jpeg({ quality: q, mozjpeg: true, progressive: true }).toBuffer();
      const cmp = await sharp(enc).greyscale().raw().toBuffer();
      let sum = 0;
      for (let i = 0; i < ref.length; i++) sum += Math.abs(ref[i] - cmp[i]);
      totals[q].bytes += enc.length;
      totals[q].diff += sum / ref.length;
      totals[q].n++;
    }
  }

  console.log(`sample: ${sample.length} images, ${(sourceBytes / 1048576).toFixed(1)}M source\n`);
  console.log(' q    total     avg/img   mean-diff   vs source');
  console.log('-'.repeat(52));
  for (const q of QUALITIES) {
    const t = totals[q];
    console.log(
      ` ${q}   ${(t.bytes / 1048576).toFixed(2).padStart(6)}M   ` +
      `${(t.bytes / t.n / 1024).toFixed(0).padStart(5)}KB   ` +
      `${(t.diff / t.n).toFixed(2).padStart(7)}     ` +
      `-${(100 * (1 - t.bytes / sourceBytes)).toFixed(1)}%`
    );
  }
})();
