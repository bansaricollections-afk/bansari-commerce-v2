/**
 * POST /api/reviews/submit
 *
 * Public, because a review invitation is emailed to guests who have no
 * account. The signed token in the body is the credential; everything it
 * claims is re-verified server-side by submitReview(), which reads the order
 * fresh rather than trusting the request.
 *
 * The body cannot set product, email, verified_purchase or status. Those come
 * from the order line the token names. A caller controls only their display
 * name, the rating and the words.
 */
import { type NextRequest } from 'next/server';
import { verifyReviewToken } from '@/lib/review-token';
import { submitReview } from '@/services/review.service';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

const TOKEN_MESSAGE: Record<string, string> = {
  MALFORMED:     'That review link is not valid. Please use the link from your delivery email.',
  BAD_SIGNATURE: 'That review link is not valid. Please use the link from your delivery email.',
  EXPIRED:       'That review link has expired. Contact us and we will send a fresh one.',
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const limited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  // Named `payload`, not `body` — the review's own text field is called
  // `body`, and one of those shadowing the other is how mistakes get made.
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const token = typeof payload.token === 'string' ? payload.token : '';
  const verified = verifyReviewToken(token);
  if (!verified.valid) {
    return apiError(requestId, verified.reason, TOKEN_MESSAGE[verified.reason] ?? 'Invalid link.', 400);
  }

  const result = await submitReview({
    orderItemId: verified.payload.orderItemId,
    orderId:     verified.payload.orderId,
    rating:      Number(payload.rating),
    authorName:  String(payload.authorName ?? ''),
    title:       typeof payload.title === 'string' ? payload.title : null,
    body:        typeof payload.body === 'string' ? payload.body : null,
  });

  if (!result.ok) {
    const status = result.code === 'INTERNAL' ? 500 : 400;
    return apiError(requestId, result.code, result.message, status);
  }

  return apiSuccess({ reviewId: result.reviewId, status: 'pending' });
}
