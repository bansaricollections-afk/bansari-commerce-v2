import { NextRequest, NextResponse } from 'next/server';

import { validateCoupon } from '@/services/coupon.service';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';
import { validateCartItems } from '@/services/product.service';

export const dynamic = 'force-dynamic';

type CartItem = { productId: number; quantity: number; variantId?: number | null };

/**
 * Coupon preview for the cart/checkout UI.
 *
 * PREVIEW ONLY. This never decides what a customer is charged — create-order
 * re-validates the code and recomputes the discount from the database before
 * building the payment. If this endpoint and create-order ever disagreed,
 * create-order wins, because it is the one that talks to the gateway.
 *
 * The subtotal is recomputed here from the cart items rather than accepted from
 * the browser. Trusting a client-sent subtotal would let someone claim a
 * ₹50,000 cart to clear a min_order threshold and preview a discount they are
 * not entitled to — harmless at payment time, but it would show a total the
 * customer then does not get, which is worse than refusing.
 *
 * Public and unauthenticated because checkout is guest-first; rate limited on
 * the checkout bucket so it cannot be used to brute-force valid codes cheaply.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const limited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  let body: { code?: unknown; items?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) return apiError(requestId, 'MISSING_FIELD', 'Please enter a coupon code.', 400);
  if (code.length > 40) return apiError(requestId, 'VALIDATION_ERROR', 'Invalid coupon code.', 400);

  const rawItems = Array.isArray(body.items) ? (body.items as CartItem[]) : null;
  if (!rawItems || rawItems.length === 0) {
    return apiError(requestId, 'VALIDATION_ERROR', 'Your cart is empty.', 400);
  }
  // Same cap as create-order: each line costs a database lookup.
  if (rawItems.length > 50) {
    return apiError(requestId, 'VALIDATION_ERROR', 'Too many items in cart.', 400);
  }

  const cart = await validateCartItems(rawItems);
  if (!cart.valid) {
    return apiError(requestId, 'CART_INVALID', cart.errors.join(' '), 400);
  }

  const subtotal =
    Math.round(
      cart.lineItems.reduce((s: number, i: { lineTotal: number }) => s + i.lineTotal, 0) * 100
    ) / 100;

  const result = await validateCoupon(code, subtotal);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, requestId, message: result.reason },
      { status: 200 } // A rejected coupon is a normal outcome, not an error.
    );
  }

  return NextResponse.json({
    success: true,
    requestId,
    code: result.coupon.code,
    description: result.coupon.description,
    discount: result.discount,
    subtotal,
  });
}
