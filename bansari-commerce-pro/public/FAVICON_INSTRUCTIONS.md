# Favicon Generation Instructions

The following binary favicon files must be generated and committed to this directory:

## Required Files

| Filename | Size | Format |
|---|---|---|
| `favicon.ico` | 32×32 px | ICO (can contain 16×16 and 32×32 internally) |
| `favicon-16x16.png` | 16×16 px | PNG-24 |
| `apple-touch-icon.png` | 180×180 px | PNG-24 |

## Source File

Start from `public/favicon.svg` (already committed).
This is the brand B mark on a terracotta (#7c3f2e) background.
Replace with your actual logo SVG before generating final production favicons.

## Free Generation Tool

Go to: https://realfavicongenerator.net

1. Upload `public/favicon.svg`
2. Configure platform settings (use defaults)
3. Click "Generate your Favicons and HTML code"
4. Download the package
5. Copy into this `public/` directory:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `apple-touch-icon.png`
6. Commit and push to main

## Alternative CLI Method

```bash
# Install ImageMagick
brew install imagemagick  # macOS
apt-get install imagemagick  # Linux

# Generate from SVG
convert -background none public/favicon.svg -resize 32x32 public/favicon.ico
convert -background none public/favicon.svg -resize 16x16 public/favicon-16x16.png
convert -background none public/favicon.svg -resize 180x180 public/apple-touch-icon.png
```

## After Committing

Verify the favicon appears in the browser tab when visiting the site.
On iOS: Add to Home Screen → check the apple-touch-icon appears.

## Note on site.webmanifest

`site.webmanifest` is already committed and references `favicon-16x16.png` and `apple-touch-icon.png`.
No changes needed to the manifest after adding these files.
