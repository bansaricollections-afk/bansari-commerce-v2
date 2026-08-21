import { NextRequest, NextResponse } from 'next/server';

import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';
import { verifyAndPersistCashfreeOrder } from '@/lib/cashfree-order';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * Cashfree webhook — the authoritative, ad-blocker-proof reconciliation path.
 *
 * The signature is computed over `timestamp + rawBody` (the UNPARSED body), so
 * the raw text is read and verified BEFORE any JSON parsing. Only after the
 * signature passes is the payload parsed. Order persistence is delegated to the
 * shared idempotent path, so a webhook that arrives before, after, or instead
 * of the browser verify call still results in exactly one order.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const log = createLogger({ service: 'cashfree.webhook', requestId });

  const rateLimited = checkRateLimit(request, 'webhook', RATE_LIMIT_WEBHOOK, requestId);
  if (rateLimited) return rateLimited;

  // 1. Raw body FIRST — never parse before verifying.
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature') ?? '';
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';

  if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature)) {
    log.warn('cashfree.webhook.signature_invalid');
    return apiError(requestId, 'INVALID_SIGNATURE', 'Invalid webhook signature.', 401);
  }

  // 2. Now it is safe to parse.
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed payload.', 400);
  }

  // Cashfree payment webhooks nest the order under data.order.order_id.
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const order = (data.order ?? {}) as Record<string, unknown>;
  const orderId = typeof order.order_id === 'string' ? order.order_id : '';
  const type = typeof payload.type === 'string' ? payload.type : '';

  if (!orderId) {
    // Ack non-order events (or shapes we don't handle) so Cashfree stops retrying.
    log.info('cashfree.webhook.ignored', { type });
    return NextResponse.json({ success: true, requestId, handled: false }, { status: 200 });
  }

  try {
    // Persistence re-fetches status from Cashfree and is idempotent — the
    // webhook payload itself is never trusted as proof of payment.
    const result = await verifyAndPersistCashfreeOrder(orderId, { requestId, source: 'webhook' });
    log.info('cashfree.webhook.processed', { orderId, type, ok: result.ok });

    /*
     * Acknowledge (200) anything Cashfree retrying cannot fix: a successful
     * persist, and non-actionable outcomes such as NOT_PAID, PENDING_NOT_FOUND
     * or an amount/currency mismatch — all of which return a 4xx status and
     * would fail identically on every retry.
     *
     * A server-side failure (5xx, e.g. DB_ERROR) is different: the payment is
     * confirmed PAID at Cashfree but we failed to record it. Acknowledging that
     * would permanently lose the event, so return 500 and let Cashfree retry.
     */
    if (!result.ok && result.status >= 500) {
      log.error('cashfree.webhook.persist_failed_retryable', { orderId, code: result.code });
      return apiError(requestId, result.code, result.message, 500);
    }

    return NextResponse.json({ success: true, requestId, handled: result.ok }, { status: 200 });
  } catch (err) {
    log.error('cashfree.webhook.unhandled', err);
    // 500 so Cashfree retries a genuinely failed reconciliation.
    return apiError(requestId, 'WEBHOOK_ERROR', 'Processing failed.', 500);
  }
}
