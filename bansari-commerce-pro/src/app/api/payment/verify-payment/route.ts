import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'payment.verify' });

// HMAC-SHA256 always produces a 32-byte digest = 64 hex characters.
// timingSafeEqual throws ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH if buffers differ.
// We guard against this explicitly before calling timingSafeEqual.
const HMAC_SHA256_HEX_LENGTH = 64;

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const rLog = log.child({ requestId });

  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError(requestId, 'MISSING_FIELDS', 'Missing payment details.', 400);
    }

    // P0-4: Validate types before any crypto operation.
    if (
      typeof razorpay_order_id   !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature  !== 'string'
    ) {
      return apiError(requestId, 'INVALID_FIELDS', 'Payment detail fields must be strings.', 400);
    }

    // P0-4: Reject signatures that are not exactly 64 hex characters.
    // A malformed signature (wrong length or non-hex) would cause
    // Buffer.from(..., 'hex') to produce a buffer of different length than
    // the expected 32-byte digest, making timingSafeEqual throw instead of
    // returning false. We return 400 explicitly instead.
    if (
      razorpay_signature.length !== HMAC_SHA256_HEX_LENGTH ||
      !/^[0-9a-f]+$/i.test(razorpay_signature)
    ) {
      rLog.warn('payment.verify.signature_malformed', {
        length: razorpay_signature.length,
        razorpay_order_id,
        razorpay_payment_id,
      });
      return apiError(requestId, 'INVALID_SIGNATURE', 'Payment verification failed.', 400);
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

    // Both buffers are now guaranteed to be exactly 32 bytes (64 hex chars).
    // timingSafeEqual will not throw.
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
