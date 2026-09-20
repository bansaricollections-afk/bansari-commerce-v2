import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { buildInstagramPreview } from '@/services/instagram.service';

const log = createLogger({ service: 'admin.instagram.preview' });

/**
 * POST /api/admin/instagram/preview  { productId }
 *
 * Does all the work of a publish except the publishing: fetches the product's
 * photos, pads each to Instagram's 4:5 minimum, uploads the renditions, and
 * assembles the caption. Returns what WOULD be posted.
 *
 * Deliberately not a GET. It writes image renditions to storage, and a GET
 * that mutates storage will eventually be called by something that assumes
 * GETs are safe — a prefetch, a crawler, a retry.
 *
 * Image work is measured in seconds, not milliseconds: eight photos decoded,
 * resized, re-encoded and uploaded.
 */
export const maxDuration = 120;

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
    const preview = await buildInstagramPreview(productId);

    log.info('admin.instagram.preview.ok', {
      productId,
      images: preview.images.length,
      padded: preview.images.filter((i) => i.action === 'padded').length,
      skipped: preview.skipped.length,
      requestId,
    });

    return NextResponse.json({
      success: true,
      requestId,
      caption: preview.caption,
      hashtags: preview.hashtags,
      usedAttributes: preview.usedAttributes,
      productUrl: preview.productUrl,
      images: preview.images,
      skipped: preview.skipped,
      product: {
        id: preview.product.id,
        name: preview.product.name,
        price: preview.product.price,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.instagram.preview.failed', err, { productId, requestId });
    return apiError(requestId, 'PREVIEW_FAILED', message, 500);
  }
}
