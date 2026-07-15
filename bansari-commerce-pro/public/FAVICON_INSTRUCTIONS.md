# Favicon Generation Instructions

The SVG source is already in the repository at `public/favicon.svg`.

Generate the required binary assets from it using one of the methods below.
All output files must be placed in `public/`.

---

## Required Files

| File | Size | Used by |
|---|---|---|
| `favicon.ico` | Multi-size (16×16, 32×32, 48×48) | All browsers — tab icon |
| `favicon-16x16.png` | 16×16 px | Legacy browsers |
| `favicon-32x32.png` | 32×32 px | Standard browsers |
| `apple-touch-icon.png` | 180×180 px | iOS home screen |
| `android-chrome-192x192.png` | 192×192 px | Android home screen |
| `android-chrome-512x512.png` | 512×512 px | Android splash screen |

---

## Method 1 — realfavicongenerator.net (recommended, free)

1. Go to https://realfavicongenerator.net
2. Upload `public/favicon.svg`
3. Configure background colour: `#ffffff` (light) / `#0f172a` (dark)
4. Click **Generate your Favicons and HTML code**
5. Download the package and copy all image files into `public/`
6. Ignore the HTML snippet — Next.js `src/app/layout.tsx` already declares
   the icon metadata.

## Method 2 — CLI (ImageMagick)

```bash
# Install ImageMagick if not already present
brew install imagemagick          # macOS
apt-get install imagemagick       # Ubuntu

cd bansari-commerce-pro

# PNG exports
convert -background none -resize 16x16   public/favicon.svg public/favicon-16x16.png
convert -background none -resize 32x32   public/favicon.svg public/favicon-32x32.png
convert -background none -resize 180x180 public/favicon.svg public/apple-touch-icon.png
convert -background none -resize 192x192 public/favicon.svg public/android-chrome-192x192.png
convert -background none -resize 512x512 public/favicon.svg public/android-chrome-512x512.png

# Combine into .ico (16, 32, 48)
convert public/favicon-16x16.png \
        <(convert -background none -resize 32x32 public/favicon.svg png:-) \
        <(convert -background none -resize 48x48 public/favicon.svg png:-) \
        public/favicon.ico
```

## Method 3 — Node.js (sharp)

```bash
npm install --save-dev sharp
```

```js
// scripts/generate-favicons.mjs
import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/favicon.svg');

const sizes = [
  { file: 'public/favicon-16x16.png',          size: 16  },
  { file: 'public/favicon-32x32.png',          size: 32  },
  { file: 'public/apple-touch-icon.png',       size: 180 },
  { file: 'public/android-chrome-192x192.png', size: 192 },
  { file: 'public/android-chrome-512x512.png', size: 512 },
];

for (const { file, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log(`Generated ${file}`);
}

// favicon.ico requires a separate tool (png-to-ico, to-ico, etc.)
// npm install --save-dev to-ico
```
