import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { buildReel } from '@/lib/instagram/reel';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getProductById } from '@/services/product.service';

const log = createLogger({ service: 'admin.instagram.reel' });

/**
 * POST /api/admin/instagram/reel  { productId }
 *
 * Builds a 9:16 MP4 from the product's photos and returns a download URL.
 * It does NOT post it — Instagram's API cannot attach music-library audio, and
 * trending audio is the whole point of a reel for a small account. The
 * merchant downloads this on their phone and posts it from the app, where the
 * audio is.
 */

/** Node runtime, not edge: this spawns the ffmpeg binary. */
export const runtime = 'nodejs';

/** Decoding, re-rendering and encoding a dozen 1080x1920 frames. */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let body: { productId?: unknown };
  try {
    body = (await request.json()) as { productId?: unknown };
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return apiError(requestId, 'VALIDATION', 'productId must be a positive integer', 422);
  }

  try {
    const product = await getProductById(productId);
    if (!product) return apiError(requestId, 'NOT_FOUND', `Product ${productId} not found`, 404);

    const imageUrls = (product.images ?? [])
      .map((img) => (typeof img === 'string' ? img : img?.url))
      .filter((u): u is string => typeof u === 'string' && u.length > 0);

    if (imageUrls.length === 0) {
      return apiError(requestId, 'VALIDATION', 'This product has no images', 422);
    }

    const sb = createServiceRoleClient();

    const result = await buildReel({
      imageUrls,
      productName: product.name,
      uploader: async (buf) => {
        // Stable path per product: regenerating replaces rather than
        // accumulating one video per click. Videos are large.
        const path = `instagram/reels/${product.id}.mp4`;
        const { error } = await sb.storage
          .from('product-images')
          .upload(path, buf, { contentType: 'video/mp4', upsert: true });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      },
    });

    log.info('admin.instagram.reel.ok', {
      productId,
      frames: result.frames,
      seconds: result.durationSeconds,
      mb: (result.bytes / 1024 / 1024).toFixed(2),
      requestId,
    });

    return NextResponse.json({ success: true, requestId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.instagram.reel.failed', err, { productId, requestId });
    return apiError(requestId, 'REEL_FAILED', message, 500);
  }
}
