import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { verifyWebhookSignature } from '@/lib/razorpay';
import {
  updatePaymentStatusFromWebhook,
  recoverOrderFromWebhook,
  type RazorpayPaymentEntity,
} from '@/services/order.service';
import { confirmStock, releaseStock, getReservationByOrder } from '@/services/reservation.service';
import { confirmCouponUsage } from '@/services/coupon.service';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { withRetry, isTransientError } from '@/lib/retry';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'webhook' });

// order.paid added as the canonical terminal success event from Razorpay
const HANDLED_EVENTS = new Set([
  'payment.captured',
  'payment.failed',
  'order.paid',
]);

async function fetchRazorpayPayment(
  paymentId: string,
  requestId: string
): Promise<RazorpayPaymentEntity | null> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const wLog      = log.child({ requestId, paymentId });

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
            Authorization:  `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const text = await res.text();
          const err  = new Error(`Razorpay ${res.status}: ${text}`) as Error & { statusCode: number };
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
 * Exactly-once deduplication via webhook_events table.
 * Returns 'new' | 'duplicate' | 'error'.
 */
async function deduplicateEvent(
  eventId:   string,
  eventType: string,
  paymentId: string | null,
  requestId: string
): Promise<'new' | 'duplicate' | 'error'> {
  const wLog = log.child({ requestId, eventId, eventType });
  try {
    const supabase    = createServiceRoleClient();
    const { error }   = await supabase
      .from('webhook_events')
      .insert({
        event_id:   eventId,
        event_type: eventType,
        payment_id: paymentId,
      });

    if (!error) return 'new';

    if (error.code === '23505') {
      wLog.info('webhook.dedup.duplicate_event', { eventId });
      return 'duplicate';
    }

    wLog.warn('webhook.dedup.write_failed', {
      eventId,
      errorCode:    error.code,
      errorMessage: error.message,
    });
    return 'error';
  } catch (err) {
    log.child({ requestId }).warn('webhook.dedup.unexpected', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return 'error';
  }
}

/**
 * Shared post-payment success handler.
 * Confirms inventory reservation and coupon usage for a Razorpay order.
 */
async function handlePaymentSuccess(
  razorpayOrderId: string,
  requestId:       string
): Promise<void> {
  const wLog = log.child({ requestId, razorpayOrderId });

  // ── Confirm inventory reservation ──────────────────────────────────────
  const reservation = await getReservationByOrder(razorpayOrderId);
  if (reservation && reservation.status === 'reserved') {
    try {
      await confirmStock(reservation.id);
      wLog.info('webhook.inventory.confirmed', { reservationId: reservation.id });
    } catch (err) {
      wLog.warn('webhook.inventory.confirm_failed', {
        reservationId: reservation.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (!reservation) {
    wLog.warn('webhook.inventory.no_reservation', {
      note: 'No reservation found for order — stock may not have been reserved.',
    });
  }

  // ── Confirm coupon usage (increment used_count) ─────────────────────────
  const supabase = createServiceRoleClient();
  const { data: pendingRow } = await supabase
    .from('pending_orders')
    .select('coupon_code')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  const couponCode = (pendingRow as { coupon_code: string | null } | null)?.coupon_code;
  if (couponCode) {
    const result = await confirmCouponUsage(couponCode);
    wLog.info('webhook.coupon.usage_confirmed', {
      couponCode,
      incremented: result.incremented,
    });
  }
}

/**
 * Shared post-payment failure handler.
 * Releases inventory reservation.
 */
async function handlePaymentFailure(
  razorpayOrderId: string,
  requestId:       string
): Promise<void> {
  const wLog = log.child({ requestId, razorpayOrderId });

  const reservation = await getReservationByOrder(razorpayOrderId);
  if (reservation && reservation.status === 'reserved') {
    await releaseStock(reservation.id);
    wLog.info('webhook.inventory.released', { reservationId: reservation.id });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const wLog      = log.child({ requestId });
  const timer     = wLog.startTimer('webhook.duration');

  const rateLimitResponse = checkRateLimit(request, 'webhook', RATE_LIMIT_WEBHOOK, requestId);
  if (rateLimitResponse) return rateLimitResponse;

  const rawBody   = await request.text();
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

  const typedEvent  = event as Record<string, unknown>;
  const eventType   = typedEvent.event;

  if (typeof eventType !== 'string' || !HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json(
      { success: true, requestId, handled: false },
      { status: 200 }
    );
  }

  const payload         = typedEvent.payload as Record<string, unknown> | undefined;

  // order.paid has a different payload shape from payment.captured/failed
  // order.paid: payload.order.entity  (+ payload.payment.entity for the associated payment)
  // payment.*:  payload.payment.entity
  let paymentId:       string | undefined;
  let razorpayOrderId: string | undefined;

  if (eventType === 'order.paid') {
    const orderWrapper  = payload?.order as Record<string, unknown> | undefined;
    const orderEntity   = orderWrapper?.entity as Record<string, unknown> | undefined;
    razorpayOrderId     = orderEntity?.id as string | undefined;

    // Also extract the payment id from payload.payment.entity
    const paymentWrapper = payload?.payment as Record<string, unknown> | undefined;
    const paymentEntity  = paymentWrapper?.entity as Record<string, unknown> | undefined;
    paymentId            = paymentEntity?.id as string | undefined;
  } else {
    const paymentWrapper = payload?.payment as Record<string, unknown> | undefined;
    const entity         = paymentWrapper?.entity as Record<string, unknown> | undefined;
    paymentId            = entity?.id as string | undefined;
    razorpayOrderId      = entity?.order_id as string | undefined;
  }

  // For payment.* events we require paymentId; for order.paid we require razorpayOrderId
  if (eventType !== 'order.paid' && (!paymentId || paymentId.length === 0)) {
    wLog.warn('webhook.missing_payment_id');
    return apiError(requestId, 'MISSING_PAYMENT_ID', 'Missing payment id.', 400);
  }

  if (eventType === 'order.paid' && (!razorpayOrderId || razorpayOrderId.length === 0)) {
    wLog.warn('webhook.order_paid.missing_order_id');
    return apiError(requestId, 'MISSING_ORDER_ID', 'Missing order id in order.paid event.', 400);
  }

  const wLogP = wLog.child({
    paymentId,
    razorpayOrderId,
  });
  wLogP.info('webhook.received', { eventType });

  // ── Exactly-once deduplication ────────────────────────────────────────
  const eventId = typeof typedEvent.id === 'string' ? typedEvent.id : null;

  if (eventId) {
    const dedupResult = await deduplicateEvent(
      eventId,
      eventType,
      paymentId ?? null,
      requestId
    );

    if (dedupResult === 'duplicate') {
      timer('info', { duplicate: true });
      return NextResponse.json(
        { success: true, requestId, handled: false, duplicate: true },
        { status: 200 }
      );
    }
  } else {
    wLogP.warn('webhook.dedup.no_event_id', {
      note: 'Razorpay event_id missing. Deduplication skipped.',
    });
  }

  // ── Business logic ────────────────────────────────────────────────────
  try {
    if (eventType === 'order.paid') {
      // ── order.paid: canonical success event ─────────────────────────
      // 1. Update order status in our DB
      const result = await updatePaymentStatusFromWebhook(
        paymentId ?? '',
        'paid'
      );

      if (!result.updated && razorpayOrderId) {
        wLogP.warn('webhook.order_paid.no_order_found.starting_recovery');

        // Attempt recovery using the associated payment id
        if (paymentId) {
          const paymentDetails = await fetchRazorpayPayment(paymentId, requestId);
          if (paymentDetails) {
            const recovery = await recoverOrderFromWebhook(paymentDetails);
            if (!recovery.recovered) {
              wLogP.error('webhook.order_paid.recovery.failed', undefined, {
                error: recovery.error,
              });
            } else {
              wLogP.info('webhook.order_paid.recovery.success', {
                orderId: recovery.orderId,
              });
            }
          }
        }
      } else {
        wLogP.info('webhook.order_paid.order_updated');
      }

      // 2. Confirm inventory + coupon (idempotent)
      if (razorpayOrderId) {
        await handlePaymentSuccess(razorpayOrderId, requestId);
      }
    } else if (eventType === 'payment.captured') {
      // ── payment.captured: secondary success signal ───────────────────
      const result = await updatePaymentStatusFromWebhook(paymentId!, 'paid');

      if (!result.updated) {
        wLogP.warn('webhook.payment_captured.no_order_found.starting_recovery');

        const paymentDetails = await fetchRazorpayPayment(paymentId!, requestId);
        if (!paymentDetails) {
          wLogP.error('webhook.recovery.fetch_failed', undefined, {
            note: 'CRITICAL: Manual intervention required.',
          });
          return apiError(
            requestId,
            'RECOVERY_FETCH_FAILED',
            'Could not fetch payment details for recovery.',
            500
          );
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
      } else {
        wLogP.info('webhook.payment_captured.order_updated');
      }

      // Confirm inventory + coupon (idempotent — order.paid may have already done this)
      if (razorpayOrderId) {
        await handlePaymentSuccess(razorpayOrderId, requestId);
      }
    } else if (eventType === 'payment.failed') {
      // ── payment.failed: release reservation ─────────────────────────
      await updatePaymentStatusFromWebhook(paymentId!, 'failed');

      if (razorpayOrderId) {
        await handlePaymentFailure(razorpayOrderId, requestId);
      } else {
        wLogP.warn('webhook.payment_failed.no_order_id', {
          note: 'Cannot release reservation without razorpay_order_id.',
        });
      }
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
  return NextResponse.json(
    { success: true, requestId, handled: true },
    { status: 200 }
  );
}

const _c = crypto.randomUUID;
void _c;
