/**
 * One-off: re-encode the oversized PNG photographs in public/ as JPEG.
 *
 * These are photographs stored losslessly, which is why they are ~2MB at only
 * ~1000-1500px. Image optimisation is bypassed in next.config.ts (the Vercel
 * transformation quota is exhausted), so the source files ship to visitors
 * as-is and their size is the page weight.
 *
 * logo-full.png is deliberately NOT converted: it is a logo and needs alpha,
 * which JPEG cannot represent. It is losslessly recompressed instead.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TO_JPEG = [
  'categories/sarees.png',
  'categories/western-wear.png',
  'categories/ethnic-glory.png',
  'categories/coords.png',
  'categories/anarkali.png',
  'categories/kurta.png',
  'products/p1.png',
];

const TO_RECOMPRESS_PNG = ['logo-full.png'];

const pub = path.join(process.cwd(), 'public');
const mb = (n) => (n / 1048576).toFixed(2) + 'M';

(async () => {
  let before = 0;
  let after = 0;

  for (const rel of TO_JPEG) {
    const src = path.join(pub, rel);
    const dest = src.replace(/\.png$/i, '.jpg');
    const sizeBefore = fs.statSync(src).size;

    await sharp(src)
      .flatten({ background: '#ffffff' }) // drop alpha; JPEG has none
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(dest);

    const sizeAfter = fs.statSync(dest).size;
    before += sizeBefore;
    after += sizeAfter;
    const cut = (100 * (1 - sizeAfter / sizeBefore)).toFixed(1);
    console.log(`${rel.padEnd(30)} ${mb(sizeBefore)} -> ${mb(sizeAfter)}  (-${cut}%)`);
    fs.unlinkSync(src);
  }

  for (const rel of TO_RECOMPRESS_PNG) {
    const src = path.join(pub, rel);
    const tmp = src + '.tmp';
    const sizeBefore = fs.statSync(src).size;

    await sharp(src)
      .png({ compressionLevel: 9, palette: true })
      .toFile(tmp);

    const sizeAfter = fs.statSync(tmp).size;
    if (sizeAfter < sizeBefore) {
      fs.renameSync(tmp, src);
      before += sizeBefore;
      after += sizeAfter;
      const cut = (100 * (1 - sizeAfter / sizeBefore)).toFixed(1);
      console.log(`${rel.padEnd(30)} ${mb(sizeBefore)} -> ${mb(sizeAfter)}  (-${cut}%) [png, alpha kept]`);
    } else {
      fs.unlinkSync(tmp);
      console.log(`${rel.padEnd(30)} left as-is (recompression made it larger)`);
    }
  }

  console.log('-'.repeat(60));
  console.log(`TOTAL ${mb(before)} -> ${mb(after)}  (-${(100 * (1 - after / before)).toFixed(1)}%)`);
})();
