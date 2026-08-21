import { NextRequest, NextResponse } from 'next/server';

import { verifyAndPersistCashfreeOrder } from '@/lib/cashfree-order';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_PAYMENT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * Browser-triggered verification. The client calls this after the Cashfree
 * checkout closes, passing only the merchant order id — NOT a success flag.
 * Actual payment truth is fetched from Cashfree server-side inside
 * verifyAndPersistCashfreeOrder. Safe to call repeatedly (idempotent).
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const log = createLogger({ service: 'cashfree.verify', requestId });

  const rateLimited = checkRateLimit(request, 'payment', RATE_LIMIT_PAYMENT, requestId);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) {
      return apiError(requestId, 'MISSING_FIELD', 'orderId is required.', 400);
    }

    const result = await verifyAndPersistCashfreeOrder(orderId, { requestId, source: 'browser' });

    if (!result.ok) {
      return apiError(requestId, result.code, result.message, result.status);
    }

    return NextResponse.json({
      success: true,
      requestId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      idempotent: result.idempotent,
    });
  } catch (err) {
    log.error('cashfree.verify.unhandled', err);
    const message = err instanceof Error ? err.message : 'Verification failed.';
    return apiError(requestId, 'CASHFREE_ERROR', message, 500);
  }
}
