import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { verifyWebhookSignature } from '@/lib/razorpay';
import {
  updatePaymentStatusFromWebhook,
  recoverOrderFromWebhook,
  type RazorpayPaymentEntity,
} from '@/services/order.service';
import { createLogger } from '@/lib/logger';
import { withRetry, isTransientError } from '@/lib/retry';

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
    // withRetry is safe here: GET /v1/payments/:id is idempotent.
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
      {
        maxAttempts: 3,
        baseDelayMs: 300,
        shouldRetry: isTransientError,
      }
    );
    return data;
  } catch (err) {
    wLog.error('webhook.fetch_payment.failed', err);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const wLog = log.child({ requestId });
  const timer = wLog.startTimer('webhook.duration');

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    wLog.warn('webhook.signature_invalid');
    return NextResponse.json(
      { success: false, error: 'Invalid webhook signature.' },
      { status: 400 }
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    wLog.warn('webhook.json_parse_failed');
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  if (!event || typeof event !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Invalid webhook payload.' },
      { status: 400 }
    );
  }

  const eventType = (event as Record<string, unknown>).event;

  if (typeof eventType !== 'string' || !HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json({ success: true, handled: false }, { status: 200 });
  }

  const payload = (event as Record<string, unknown>).payload as Record<string, unknown> | undefined;
  const paymentWrapper = payload?.payment as Record<string, unknown> | undefined;
  const entity = paymentWrapper?.entity as Record<string, unknown> | undefined;
  const paymentId = entity?.id;
  const razorpayOrderId = entity?.order_id;

  if (typeof paymentId !== 'string' || paymentId.length === 0) {
    wLog.warn('webhook.missing_payment_id');
    return NextResponse.json(
      { success: false, error: 'Missing payment id.' },
      { status: 400 }
    );
  }

  const wLogP = wLog.child({ paymentId, razorpayOrderId: razorpayOrderId as string | undefined });
  wLogP.info('webhook.received', { eventType });

  try {
    const status = eventType === 'payment.captured' ? 'paid' : 'failed';
    const result = await updatePaymentStatusFromWebhook(paymentId, status);

    if (!result.updated && eventType === 'payment.captured') {
      wLogP.warn('webhook.no_order_found.starting_recovery');

      // Fetch full payment details from Razorpay for recovery.
      // Safe to retry (GET is idempotent).
      const paymentDetails = await fetchRazorpayPayment(paymentId, requestId);

      if (!paymentDetails) {
        wLogP.error('webhook.recovery.fetch_failed', undefined, {
          note: 'CRITICAL: Manual intervention required.',
        });
        // Return 500 so Razorpay retries delivery.
        return NextResponse.json(
          { success: false, error: 'Could not fetch payment details for recovery.' },
          { status: 500 }
        );
      }

      const recovery = await recoverOrderFromWebhook(paymentDetails);

      if (!recovery.recovered) {
        wLogP.error('webhook.recovery.failed', undefined, {
          error: recovery.error,
          note: 'CRITICAL: Manual intervention required.',
        });
        return NextResponse.json(
          { success: false, error: 'Order recovery failed.' },
          { status: 500 }
        );
      }

      wLogP.info('webhook.recovery.success', { orderId: recovery.orderId });
    } else if (!result.updated && eventType === 'payment.failed') {
      wLogP.warn('webhook.failed_no_order', {
        note: 'Expected for pre-order payment failures.',
      });
    } else {
      wLogP.info('webhook.order_updated', { status });
    }
  } catch (err) {
    wLogP.error('webhook.unhandled', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Webhook processing failed.' },
      { status: 500 }
    );
  }

  timer('info');
  return NextResponse.json({ success: true, handled: true }, { status: 200 });
}
