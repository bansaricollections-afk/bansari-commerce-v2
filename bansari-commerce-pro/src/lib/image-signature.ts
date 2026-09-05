/**
 * Verify an upload really is the image type it claims, by inspecting its bytes.
 *
 * WHY
 * Both upload paths previously trusted two things the client fully controls:
 *
 *   1. `file.type` — the declared MIME. A browser sends whatever it likes; a
 *      script can send anything at all. An allowlist over a client-declared
 *      string proves nothing.
 *   2. `file.name` — the campaign uploader derived the stored extension with
 *      `file.name.split('.').pop()`, so the object key was built from an
 *      attacker-influenced string.
 *
 * Neither was critically exploitable here: uploads are admin-only, files are
 * served from a different origin (supabase.co) with an image content-type and
 * `X-Content-Type-Options: nosniff`, so a polyglot would not execute. But
 * "several independent controls happen to save us" is not the same as
 * validation, and the fix is cheap.
 *
 * WHAT THIS DOES
 * Reads the leading bytes and matches a real file signature. The DETECTED type
 * — never the declared one — is what callers should use for both the stored
 * `contentType` and the file extension. That closes the MIME lie and the
 * filename-derived-extension issue in one step.
 *
 * Deliberately dependency-free: these signatures are stable and well
 * documented, and adding a package to a payment-handling app to read four
 * bytes is a worse trade than twenty lines here.
 */

export type DetectedImage = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif';
  ext: 'jpg' | 'png' | 'webp' | 'gif' | 'avif';
};

/** Does `bytes` start with `sig` at `offset`? */
function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/** ASCII compare at an offset, for container brands like "WEBP" / "ftyp". */
function ascii(bytes: Uint8Array, text: string, offset: number): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Identify an image from its magic bytes. Returns null for anything not
 * positively recognised — callers must reject on null rather than fall back to
 * the declared type, or the whole check is pointless.
 */
export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: 'png' };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (ascii(bytes, 'GIF87a', 0) || ascii(bytes, 'GIF89a', 0)) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  // WebP: RIFF....WEBP — brand at offset 8, size bytes 4-7 are not fixed.
  if (ascii(bytes, 'RIFF', 0) && ascii(bytes, 'WEBP', 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // AVIF: ISO-BMFF "ftyp" box at offset 4, brand "avif" or "avis" at offset 8.
  if (ascii(bytes, 'ftyp', 4) && (ascii(bytes, 'avif', 8) || ascii(bytes, 'avis', 8))) {
    return { mime: 'image/avif', ext: 'avif' };
  }

  return null;
}

/**
 * Convenience wrapper for a Web `File`/`Blob`. Reads only the first 32 bytes —
 * enough for every signature above, and avoids pulling a large upload into
 * memory just to identify it.
 */
export async function detectImageTypeFromFile(file: Blob): Promise<DetectedImage | null> {
  const head = await file.slice(0, 32).arrayBuffer();
  return detectImageType(new Uint8Array(head));
}
