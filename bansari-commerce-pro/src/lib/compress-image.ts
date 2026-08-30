/**
 * Browser-side image compression, applied before upload to Supabase storage.
 *
 * WHY THIS EXISTS
 * The catalogue was measured at 431MB across 207 product images, 394MB of it
 * PNG, with 197 images over 1MB and the worst at 4.7MB. They are photographs
 * exported losslessly from AI image tools, and PNG cannot compress a photograph
 * — hence multi-megabyte files at only ~1000-1500px.
 *
 * That weight reaches visitors unmodified: `unoptimized` is set in
 * next.config.ts because the Vercel image-transformation quota is exhausted, so
 * next/image emits a plain <img> pointing at the original file. There is no
 * resizing layer left to hide behind.
 *
 * Uploads go straight from the browser to Supabase, so this cannot run on the
 * server with sharp. Re-encoding here also means the admin uploads ~10x fewer
 * bytes, which makes the upload itself faster.
 *
 * WHAT IT DOES NOT TOUCH
 * - Videos: handled separately by the caller.
 * - GIFs: canvas would flatten an animation to its first frame.
 * - Anything that ends up larger after re-encoding (already-optimised JPEGs).
 */

/** Longest edge, in px. The widest content container in this layout is 1360px. */
const MAX_EDGE = 2000;

/** JPEG quality. 0.82 is the usual point where artefacts stop being visible. */
const QUALITY = 0.82;

/** Formats worth re-encoding. GIF is excluded deliberately (see above). */
const COMPRESSIBLE = ["image/png", "image/jpeg", "image/webp"];

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  /** False when the original was kept — unsupported type, or re-encoding did not help. */
  changed: boolean;
};

function replaceExtension(name: string, ext: string): string {
  const lastDot = name.lastIndexOf(".");
  return (lastDot > 0 ? name.slice(0, lastDot) : name) + "." + ext;
}

/**
 * Re-encode `file` as JPEG, capped at MAX_EDGE on its longest side.
 * Always resolves: on any failure the original file is returned unchanged, so a
 * decoding quirk can never block an upload.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    originalBytes: file.size,
    compressedBytes: file.size,
    changed: false,
  };

  if (!COMPRESSIBLE.includes(file.type)) return unchanged;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return unchanged;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    // JPEG has no alpha channel; without this, transparent pixels turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob) return unchanged;

    // An already-well-compressed JPEG can come back bigger. Keep the smaller one.
    if (blob.size >= file.size) return unchanged;

    return {
      file: new File([blob], replaceExtension(file.name, "jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
      originalBytes: file.size,
      compressedBytes: blob.size,
      changed: true,
    };
  } catch {
    return unchanged;
  } finally {
    bitmap.close();
  }
}
