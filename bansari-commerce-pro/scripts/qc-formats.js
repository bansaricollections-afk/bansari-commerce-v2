/**
 * Compare encoding strategies against the untouched original PNGs.
 *
 * Error is measured against the original resized to the SAME dimensions as the
 * candidate, so this scores encoding fidelity rather than penalising resolution.
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Originals kept by the backfill (pre -c.jpg), chosen for varied fabric detail.
const SAMPLES = [
  '1784625575586-chatgpt-image-jul-19-2026-02-55-23-am.png',
  '1787604480687-pomelli-photoshoot-image-2k-0825.png',
  '1787692823053-pure-cotton-kalamkari-elegance.png',
  '1787510603558-chatgpt-image-aug-2-2026-03-06.png',
];

const VARIANTS = [
  { name: 'jpeg q90 2000 4:2:0', w: 2000, fn: (p) => p.jpeg({ quality: 90, mozjpeg: true, progressive: true }) },
  { name: 'jpeg q90 2000 4:4:4', w: 2000, fn: (p) => p.jpeg({ quality: 90, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' }) },
  { name: 'jpeg q95 2400 4:4:4', w: 2400, fn: (p) => p.jpeg({ quality: 95, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' }) },
  { name: 'webp q88 2400     ', w: 2400, fn: (p) => p.webp({ quality: 88, effort: 5 }) },
  { name: 'webp q92 2400     ', w: 2400, fn: (p) => p.webp({ quality: 92, effort: 5 }) },
  { name: 'avif q63 2400     ', w: 2400, fn: (p) => p.avif({ quality: 63, effort: 4 }) },
  { name: 'avif q70 2400     ', w: 2400, fn: (p) => p.avif({ quality: 70, effort: 4 }) },
];

(async () => {
  const acc = VARIANTS.map(() => ({ bytes: 0, err: 0, n: 0 }));

  for (const key of SAMPLES) {
    const { data, error } = await db.storage.from('product-images').download(key);
    if (error) { console.log('skip', key, error.message); continue; }
    const src = Buffer.from(await data.arrayBuffer());

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      const base = () => sharp(src).rotate()
        .resize({ width: v.w, height: v.w, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' });

      const enc = await v.fn(base()).toBuffer();

      // Reference at the candidate's own dimensions.
      const meta = await sharp(enc).metadata();
      // Colour, not greyscale: chroma subsampling differences are invisible
      // in luma alone, and 4:4:4 is precisely a chroma change.
      const ref = await base().resize(meta.width, meta.height, { fit: 'fill' })
        .removeAlpha().raw().toBuffer();
      const cmp = await sharp(enc).removeAlpha().raw().toBuffer();

      let sum = 0;
      for (let j = 0; j < ref.length; j++) sum += Math.abs(ref[j] - cmp[j]);

      acc[i].bytes += enc.length;
      acc[i].err += sum / ref.length;
      acc[i].n++;
    }
  }

  console.log(`\n${SAMPLES.length} originals\n`);
  console.log('variant                 avg size    mean err   vs current');
  console.log('-'.repeat(62));
  const cur = acc[0];
  VARIANTS.forEach((v, i) => {
    const a = acc[i];
    const dSize = 100 * (a.bytes / cur.bytes - 1);
    console.log(
      `${v.name}  ${(a.bytes / a.n / 1024).toFixed(0).padStart(6)}KB   ` +
      `${(a.err / a.n).toFixed(2).padStart(6)}    ` +
      `${(dSize >= 0 ? '+' : '') + dSize.toFixed(0)}%`
    );
  });
})();
