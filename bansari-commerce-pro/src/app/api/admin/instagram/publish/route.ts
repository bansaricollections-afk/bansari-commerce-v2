import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { CAPTION_MAX } from '@/lib/instagram/caption';
import { publishToInstagram } from '@/services/instagram.service';

const log = createLogger({ service: 'admin.instagram.publish' });

/**
 * POST /api/admin/instagram/publish
 *   { productId, caption, hashtags, imageUrls, altText? }
 *
 * The irreversible one. Everything expensive already happened in /preview, so
 * what remains is Instagram's own two-phase publish — which still takes tens
 * of seconds because Meta fetches and processes each image.
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const productId = Number(body.productId);
  const caption = typeof body.caption === 'string' ? body.caption : '';
  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];
  const hashtags = Array.isArray(body.hashtags)
    ? body.hashtags.filter((t): t is string => typeof t === 'string')
    : [];
  const altText = typeof body.altText === 'string' ? body.altText : undefined;

  if (!Number.isInteger(productId) || productId <= 0) {
    return apiError(requestId, 'VALIDATION', 'productId must be a positive integer', 422);
  }
  if (!caption.trim()) {
    return apiError(requestId, 'VALIDATION', 'caption is required', 422);
  }
  // Checked here as well as in the generator, because the caption is editable
  // on screen and Instagram rejects the whole post for an over-long one.
  if (caption.length > CAPTION_MAX) {
    return apiError(
      requestId,
      'VALIDATION',
      `Caption is ${caption.length} characters; Instagram allows ${CAPTION_MAX}`,
      422
    );
  }
  if (imageUrls.length === 0) {
    return apiError(requestId, 'VALIDATION', 'At least one image is required', 422);
  }

  /*
   * Only our own storage may be published.
   *
   * These URLs arrive from the browser and are handed to Meta, which fetches
   * them. Without this check the endpoint would publish any URL an
   * authenticated session cared to name, to the business's own Instagram
   * account. Restricting it to the bucket /preview writes to means only
   * renditions this system produced can be posted.
   */
  const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  const foreign = imageUrls.filter((u) => !u.startsWith(storagePrefix));
  if (foreign.length > 0) {
    log.warn('admin.instagram.publish.foreign_url_rejected', { count: foreign.length, requestId });
    return apiError(
      requestId,
      'VALIDATION',
      'Images must be renditions produced by Preview, not external URLs',
      422
    );
  }

  try {
    const result = await publishToInstagram({ productId, caption, hashtags, imageUrls, altText });

    log.info('admin.instagram.publish.ok', {
      productId,
      postId: result.postId,
      mediaId: result.mediaId,
      requestId,
    });

    return NextResponse.json({ success: true, requestId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.instagram.publish.failed', err, { productId, requestId });
    return apiError(requestId, 'PUBLISH_FAILED', message, 500);
  }
}
