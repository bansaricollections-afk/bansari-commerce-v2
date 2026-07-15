import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'payment.verify' });

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const rLog = log.child({ requestId });

  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError(requestId, 'MISSING_FIELDS', 'Missing payment details.', 400);
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      rLog.error('payment.verify.secret_missing');
      return apiError(requestId, 'CONFIG_ERROR', 'Payment configuration error.', 500);
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const verified = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!verified) {
      rLog.warn('payment.verify.signature_invalid', { razorpay_order_id, razorpay_payment_id });
      return apiError(requestId, 'INVALID_SIGNATURE', 'Payment verification failed.', 400);
    }

    rLog.info('payment.verify.ok', { razorpay_order_id, razorpay_payment_id });

    return NextResponse.json({
      success: true,
      requestId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (err) {
    rLog.error('payment.verify.unhandled', err);
    return apiError(requestId, 'INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
