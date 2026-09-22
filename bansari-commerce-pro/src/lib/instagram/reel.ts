/**
 * Reel generation — turn a product's photos into a 9:16 video.
 *
 * WHY THIS PRODUCES A FILE RATHER THAN POSTING IT
 * Instagram's publishing API can upload a reel, but it has NO parameter for
 * Instagram's music library. No trending audio, no licensed tracks, no music
 * stickers. Audio can only be whatever is already baked into the video.
 *
 * Trending audio is the main reason a small account reaches strangers, and it
 * is selectable only inside the Instagram app. So automating the upload would
 * actively cost reach: it would produce a silent reel that no tool could then
 * add audio to.
 *
 * The division of labour that actually works is therefore: this builds the
 * video — correct framing, consistent timing, nothing cropped — and the
 * merchant posts it from their phone, where the audio is. The tedious half is
 * automated; the half that needs the app stays in the app.
 *
 * WHY THE PADDING MATTERS EVEN MORE HERE THAN FOR FEED POSTS
 * A reel is 9:16 — a ratio of 0.5625. This catalogue is shot at 0.667 and
 * 0.75. Letting Instagram crop a 2:3 photo to 9:16 removes roughly a quarter
 * of its height, which on a full-length garment is the hem and the feet. So
 * every frame is fitted, never cropped, onto the brand's cream.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

/** Reels are 1080x1920. Anything else gets letterboxed by Instagram. */
const W = 1080;
const H = 1920;

/** Seconds per photo. Long enough to read a garment, short enough to hold
 *  attention across a 6–8 image product. */
const SECONDS_PER_IMAGE = 2.2;

/** Instagram rejects reels under 3 seconds. */
const MIN_DURATION = 3;

/** Reels can run to 90s, but engagement on a product slideshow falls away
 *  long before that. Ten images at 2.2s is already 22s. */
const MAX_IMAGES = 10;

/** --bc-cream, matching the feed-post pipeline and the site itself. */
const CREAM = { r: 255, g: 253, b: 249, alpha: 1 } as const;

export type ReelResult = {
  /** Public URL of the finished MP4. */
  url: string;
  durationSeconds: number;
  frames: number;
  bytes: number;
};

/**
 * Render one photo into a full-bleed 1080x1920 frame.
 *
 * `fit: 'contain'` scales the photo to fit entirely inside the frame and fills
 * the rest with cream. Nothing is cropped — the same rule the feed pipeline
 * follows, for the same reason.
 */
async function buildFrame(source: Buffer, caption: string | null): Promise<Buffer> {
  const base = sharp(source)
    .resize(W, H, { fit: 'contain', background: CREAM, withoutEnlargement: false })
    .flatten({ background: CREAM })
    .toColorspace('srgb');

  if (!caption) return base.jpeg({ quality: 92 }).toBuffer();

  /*
   * Text baked into a frame is permanent — a reel stays on the profile and
   * cannot be edited the way a caption can. So only facts that do not change
   * go here: the product name and the domain.
   *
   * The PRICE is deliberately excluded. It belongs in the caption, where it
   * can be corrected. This is the same reasoning as the printed parcel card,
   * applied in the same direction: do not permanently render something that
   * might change.
   */
  const safe = caption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 60);

  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="${H - 210}" width="${W}" height="210" fill="#FFFDF9" opacity="0.92"/>
       <rect x="70" y="${H - 186}" width="56" height="2" fill="#C9A96E"/>
       <text x="70" y="${H - 120}" font-family="Georgia, serif" font-size="46"
             fill="#1A0F16">${safe}</text>
       <text x="70" y="${H - 62}" font-family="Arial, sans-serif" font-size="30"
             letter-spacing="2" fill="#9E7B47">bansaricollection.in</text>
     </svg>`
  );

  return base
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/**
 * Build the reel and return a public URL.
 *
 * `uploader` is injected rather than imported so this module stays free of
 * storage concerns and can be exercised on its own.
 */
export async function buildReel(opts: {
  imageUrls: string[];
  productName: string;
  uploader: (buf: Buffer) => Promise<string>;
}): Promise<ReelResult> {
  const sources = opts.imageUrls.slice(0, MAX_IMAGES);
  if (sources.length === 0) throw new Error('No images to build a reel from');

  const dir = await mkdtemp(join(tmpdir(), 'bc-reel-'));

  try {
    // Frames are written to disk rather than piped: ffmpeg's image sequence
    // input is far simpler to reason about than a pipe, and the whole job is
    // a handful of JPEGs.
    let written = 0;
    for (const [i, url] of sources.entries()) {
      const res = await fetch(url);
      if (!res.ok) continue; // one unreachable photo must not lose the reel
      const buf = Buffer.from(await res.arrayBuffer());
      // The name goes on the first frame only. Repeating it on every frame
      // reads as a watermark and fights the garment for attention.
      const frame = await buildFrame(buf, i === 0 ? opts.productName : null);
      await writeFile(join(dir, `f${String(i).padStart(3, '0')}.jpg`), frame);
      written += 1;
    }

    if (written === 0) throw new Error('None of the images could be fetched');

    const duration = Math.max(MIN_DURATION, written * SECONDS_PER_IMAGE);
    const out = join(dir, 'reel.mp4');

    await execFileAsync(
      ffmpegInstaller.path,
      [
        '-y',
        // Each still is held for SECONDS_PER_IMAGE.
        '-framerate', String(1 / SECONDS_PER_IMAGE),
        '-i', join(dir, 'f%03d.jpg'),
        // 30fps output: phones and Instagram both expect a normal frame rate,
        // not the 0.45fps the input implies.
        '-r', '30',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        // yuv420p is required for the video to play on iOS and to be accepted
        // by Instagram. Without it sharp's JPEGs yield yuvj420p, which many
        // players refuse.
        '-pix_fmt', 'yuv420p',
        // Guarantees even dimensions; libx264 rejects odd ones.
        '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xFFFDF9`,
        // Moves the index to the front so the file starts playing before it
        // has fully downloaded — and, more importantly here, so phones can
        // read it immediately after download.
        '-movflags', '+faststart',
        out,
      ],
      { maxBuffer: 1024 * 1024 * 64 }
    );

    const video = await readFile(out);
    const url = await opts.uploader(video);

    return { url, durationSeconds: Math.round(duration), frames: written, bytes: video.byteLength };
  } finally {
    // Serverless temp space is small and shared across invocations.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
