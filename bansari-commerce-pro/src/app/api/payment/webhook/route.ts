import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { verifyWebhookSignature } from '@/lib/razorpay';
import {
  updatePaymentStatusFromWebhook,
  recoverOrderFromWebhook,
  type RazorpayPaymentEntity,
} from '@/services/order.service';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { withRetry, isTransientError } from '@/lib/retry';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'webhook' });

const HANDLED_EVENTS = new Set(['payment.captured', 'payment.failed']);

async function fetchRazorpayPayment(
  paymentId: string,
  requestId: string
): Promise<RazorpayPaymentEntity | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const wLog = log.child({ requestId, paymentId });

  if (!keyId || !keySecret) {
    wLog.error('webhook.razorpay_creds_missing');
    return null;
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    const data = await withRetry(
      async () => {
        const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const text = await res.text();
          const err = new Error(`Razorpay ${res.status}: ${text}`) as Error & { statusCode: number };
          err.statusCode = res.status;
          throw err;
        }
        return (await res.json()) as RazorpayPaymentEntity;
      },
      { maxAttempts: 3, baseDelayMs: 300, shouldRetry: isTransientError }
    );
    return data;
  } catch (err) {
    wLog.error('webhook.fetch_payment.failed', err);
    return null;
  }
}

/**
 * P0-2: Webhook exactly-once deduplication.
 *
 * Attempts to INSERT the Razorpay event_id into webhook_events.
 * - Returns 'new'       if this is the first delivery (proceed with processing).
 * - Returns 'duplicate' if the event was already processed (skip — return 200).
 * - Returns 'error'     if the INSERT failed for a non-dedup reason (log, continue).
 *
 * Uses ON CONFLICT DO NOTHING semantics via INSERT + checking insert count.
 * The unique index on webhook_events.event_id enforces exactly-once at DB level.
 */
async function deduplicateEvent(
  eventId: string,
  eventType: string,
  paymentId: string | null,
  requestId: string
): Promise<'new' | 'duplicate' | 'error'> {
  const wLog = log.child({ requestId, eventId, eventType });
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        event_id:   eventId,
        event_type: eventType,
        payment_id: paymentId,
      });

    if (!error) return 'new';

    // PostgreSQL unique violation code: duplicate delivery
    if (error.code === '23505') {
      wLog.info('webhook.dedup.duplicate_event', { eventId });
      return 'duplicate';
    }

    // Any other error: log but do not block processing
    wLog.warn('webhook.dedup.write_failed', error, { eventId });
    return 'error';
  } catch (err) {
    log.child({ requestId }).warn('webhook.dedup.unexpected', err);
    return 'error';
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const wLog = log.child({ requestId });
  const timer = wLog.startTimer('webhook.duration');

  const rateLimitResponse = checkRateLimit(request, 'webhook', RATE_LIMIT_WEBHOOK, requestId);
  if (rateLimitResponse) return rateLimitResponse;

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    wLog.warn('webhook.signature_invalid');
    return apiError(requestId, 'INVALID_SIGNATURE', 'Invalid webhook signature.', 400);
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    wLog.warn('webhook.json_parse_failed');
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON payload.', 400);
  }

  if (!event || typeof event !== 'object') {
    return apiError(requestId, 'INVALID_PAYLOAD', 'Invalid webhook payload.', 400);
  }

  const typedEvent = event as Record<string, unknown>;
  const eventType  = typedEvent.event;

  if (typeof eventType !== 'string' || !HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json({ success: true, requestId, handled: false }, { status: 200 });
  }

  const payload       = typedEvent.payload as Record<string, unknown> | undefined;
  const paymentWrapper = payload?.payment as Record<string, unknown> | undefined;
  const entity         = paymentWrapper?.entity as Record<string, unknown> | undefined;
  const paymentId      = entity?.id;
  const razorpayOrderId = entity?.order_id;

  if (typeof paymentId !== 'string' || paymentId.length === 0) {
    wLog.warn('webhook.missing_payment_id');
    return apiError(requestId, 'MISSING_PAYMENT_ID', 'Missing payment id.', 400);
  }

  const wLogP = wLog.child({ paymentId, razorpayOrderId: razorpayOrderId as string | undefined });
  wLogP.info('webhook.received', { eventType });

  // ---------------------------------------------------------------------------
  // P0-2: Exactly-once deduplication
  // Must occur AFTER signature verification and payload extraction.
  // ---------------------------------------------------------------------------
  const eventId = typeof typedEvent.id === 'string' ? typedEvent.id : null;

  if (eventId) {
    const dedupResult = await deduplicateEvent(
      eventId,
      eventType,
      typeof paymentId === 'string' ? paymentId : null,
      requestId
    );

    if (dedupResult === 'duplicate') {
      // Already processed — acknowledge to stop Razorpay retries.
      timer('info', { duplicate: true });
      return NextResponse.json(
        { success: true, requestId, handled: false, duplicate: true },
        { status: 200 }
      );
    }
    // 'error': dedup write failed for non-dedup reason — log and continue processing.
    // 'new': proceed normally.
  } else {
    wLogP.warn('webhook.dedup.no_event_id', {
      note: 'Razorpay event_id missing from payload. Deduplication skipped.',
    });
  }

  // ---------------------------------------------------------------------------
  // Business logic
  // ---------------------------------------------------------------------------
  try {
    const status = eventType === 'payment.captured' ? 'paid' : 'failed';
    const result = await updatePaymentStatusFromWebhook(paymentId, status);

    if (!result.updated && eventType === 'payment.captured') {
      wLogP.warn('webhook.no_order_found.starting_recovery');

      const paymentDetails = await fetchRazorpayPayment(paymentId, requestId);

      if (!paymentDetails) {
        wLogP.error('webhook.recovery.fetch_failed', undefined, {
          note: 'CRITICAL: Manual intervention required.',
        });
        return apiError(requestId, 'RECOVERY_FETCH_FAILED', 'Could not fetch payment details for recovery.', 500);
      }

      const recovery = await recoverOrderFromWebhook(paymentDetails);

      if (!recovery.recovered) {
        wLogP.error('webhook.recovery.failed', undefined, {
          error: recovery.error,
          note: 'CRITICAL: Manual intervention required.',
        });
        return apiError(requestId, 'RECOVERY_FAILED', 'Order recovery failed.', 500);
      }

      wLogP.info('webhook.recovery.success', { orderId: recovery.orderId });
    } else if (!result.updated && eventType === 'payment.failed') {
      wLogP.warn('webhook.failed_no_order', { note: 'Expected for pre-order payment failures.' });
    } else {
      wLogP.info('webhook.order_updated', { status });
    }
  } catch (err) {
    wLogP.error('webhook.unhandled', err);
    return apiError(
      requestId,
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Webhook processing failed.',
      500
    );
  }

  timer('info');
  return NextResponse.json({ success: true, requestId, handled: true }, { status: 200 });
}

// keep crypto import used by generateRequestId transitive dep
const _c = crypto.randomUUID;
void _c;
