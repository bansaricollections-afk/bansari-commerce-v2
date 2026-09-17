/**
 * POST /api/reviews/photo  (multipart/form-data: token, file)
 *
 * Accepts one customer photo for a review-in-progress and returns its public
 * URL, which the form then submits alongside the review.
 *
 * PUBLIC ENDPOINT THAT WRITES FILES — so the checks matter:
 *   1. the signed token must verify, and must name a real, delivered,
 *      not-yet-reviewed order line (getReviewInvitation re-reads all of it);
 *   2. the file's MAGIC BYTES must say JPEG, PNG or WebP. Content-Type is
 *      attacker-controlled and a .jpg extension means nothing — this is the
 *      same check the admin image upload uses, and it is what stops an HTML
 *      page or a PHP webshell being stored as "photo.jpg";
 *   3. size is capped here as well as on the bucket, so an oversized upload is
 *      refused before it is streamed anywhere;
 *   4. the stored path is derived from the order line id, never from the
 *      user-supplied filename, so no traversal and no collisions.
 */
import { type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

import { verifyReviewToken } from '@/lib/review-token';
import { getReviewInvitation } from '@/services/review.service';
import { detectImageTypeFromFile } from '@/lib/image-signature';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger({ service: 'reviews.photo' });

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'review-photos';
const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const limited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed upload.', 400);
  }

  const token = String(form.get('token') ?? '');
  const verified = verifyReviewToken(token);
  if (!verified.valid) {
    return apiError(requestId, verified.reason, 'That review link is not valid.', 400);
  }

  // Re-check the purchase, not just the signature.
  const invitation = await getReviewInvitation(
    verified.payload.orderItemId,
    verified.payload.orderId
  );
  if (!invitation.ok) {
    return apiError(requestId, invitation.code, invitation.message, 400);
  }

  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return apiError(requestId, 'FILE_REQUIRED', 'Please choose a photo.', 400);
  }
  if (file.size > MAX_BYTES) {
    return apiError(requestId, 'FILE_TOO_LARGE', 'Photos must be under 5 MB.', 400);
  }

  // Magic bytes, not the declared type.
  const detected = await detectImageTypeFromFile(file);
  if (!detected || !EXTENSION[detected.mime]) {
    return apiError(
      requestId,
      'FILE_NOT_IMAGE',
      'That file is not a JPEG, PNG or WebP photo.',
      400
    );
  }

  const path = `${invitation.invitation.orderItemId}/${randomUUID()}.${EXTENSION[detected.mime]}`;

  try {
    const sb = createServiceRoleClient();
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: detected.mime,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      log.error('reviews.photo.upload_failed', { requestId, message: error.message });
      return apiError(requestId, 'UPLOAD_FAILED', 'We could not save that photo. Please try again.', 500);
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return apiSuccess({ url: data.publicUrl });
  } catch (err) {
    log.error('reviews.photo.unexpected', {
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    return apiError(requestId, 'UPLOAD_FAILED', 'We could not save that photo. Please try again.', 500);
  }
}
