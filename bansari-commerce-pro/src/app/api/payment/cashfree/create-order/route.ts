import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { createCashfreeOrder, cashfreeMode } from '@/lib/cashfree';
import { validateCartItems, type CartItem } from '@/services/product.service';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';
import { getShippingCost } from '@/lib/shipping';
import { validateCoupon } from '@/services/coupon.service';
import { readAttribution } from '@/lib/attribution';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;
const PHONE_RE = /^[6-9]\d{9}$/;

/** Merchant order reference (Cashfree `order_id`): alphanumeric + hyphen, ≤45 chars. */
function generateCfOrderRef(): string {
  return `CF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

/** Cashfree customer_id must be 3–50 alphanumeric — derive a pure-alnum token. */
function customerIdFrom(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9]/g, '').slice(0, 45) || `CUST${Date.now()}`;
}

/**
 * Resolve the authenticated user id from the server-validated JWT (null for
 * guests). Mirrors the Razorpay create-order route so pending_orders carries
 * correct ownership.
 */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const log = createLogger({ service: 'cashfree.create-order', requestId });

  const rateLimited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();

    // ── Validate cart (server-authoritative) ──
    const rawItems = Array.isArray(body?.items) ? (body.items as CartItem[]) : null;

    /*
     * SEC-03. validateCartItems() performs a database lookup per line, so an
     * unbounded items array turns one cheap anonymous request into thousands
     * of queries — a free amplification primitive on a public endpoint. No
     * genuine cart approaches this cap.
     */
    if (rawItems && rawItems.length > 50) {
      return apiError(requestId, 'VALIDATION_ERROR', 'Too many items in cart.', 400);
    }

    if (!rawItems || rawItems.length === 0) {
      return apiError(requestId, 'VALIDATION_ERROR', 'Cart is empty.', 400);
    }

    const customer = body?.customer ?? {};
    const shipping = body?.shipping ?? {};
    const name = String(customer.name ?? '').trim();
    const email = String(customer.email ?? '').trim();
    const phoneDigits = String(customer.phone ?? '').replace(/\D/g, '');

    if (name.length < 2) return apiError(requestId, 'VALIDATION_ERROR', 'Name required.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError(requestId, 'VALIDATION_ERROR', 'Valid email required.', 400);
    if (!PHONE_RE.test(phoneDigits)) return apiError(requestId, 'VALIDATION_ERROR', 'Valid 10-digit phone required.', 400);

    const sName = String(shipping.name ?? name).trim();
    const sPhone = String(shipping.phone ?? phoneDigits).replace(/\D/g, '');
    const sLine1 = String(shipping.addressLine1 ?? '').trim();
    const sCity = String(shipping.city ?? '').trim();
    const sState = String(shipping.state ?? '').trim();
    const sPin = String(shipping.postalCode ?? '').replace(/\D/g, '');
    if (!sLine1 || !sCity || !sState || !/^\d{6}$/.test(sPin)) {
      return apiError(requestId, 'VALIDATION_ERROR', 'Complete shipping address required.', 400);
    }

    const cartValidation = await validateCartItems(rawItems);
    if (!cartValidation.valid) {
      return apiError(requestId, 'CART_INVALID', cartValidation.errors.join(' '), 400);
    }
    const { lineItems } = cartValidation;

    // ── Authoritative pricing — RUPEES, never paise, never client-supplied ──
    const subtotal = round2(lineItems.reduce((s, r) => s + r.lineTotal, 0));
    const shippingFee = getShippingCost(subtotal);

    /*
     * The browser may send a coupon CODE; it may never send a discount AMOUNT.
     * The code is re-validated here against the database and the rupee figure
     * recomputed, so /api/coupons/validate is only ever a preview — this is the
     * number that reaches Cashfree.
     *
     * An invalid or expired code is NOT an error: it is simply ignored and the
     * order proceeds at full price. Failing the whole checkout because someone
     * pasted a stale code would cost a sale.
     */
    let discount = 0;
    let appliedCouponCode: string | null = null;

    const couponInput =
      typeof body?.coupon === 'string' && body.coupon.trim().length > 0
        ? body.coupon.trim().slice(0, 40)
        : null;

    if (couponInput) {
      const couponResult = await validateCoupon(couponInput, subtotal);
      if (couponResult.ok) {
        discount = couponResult.discount;
        appliedCouponCode = couponResult.coupon.code;
      } else {
        log.info('cashfree.create-order.coupon_rejected', {
          code: couponInput,
          reason: couponResult.reason,
        });
      }
    }

    const grandTotal = round2(subtotal + shippingFee - discount);
    log.info('cashfree.create-order.pricing', {
      subtotal,
      shippingFee,
      discount,
      coupon: appliedCouponCode,
      grandTotal,
    });

    const cfOrderRef = generateCfOrderRef();
    const userId = await resolveUserId(request);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

    // ── Create the Cashfree order (server-side, secret credentials) ──
    const cf = await createCashfreeOrder({
      orderId: cfOrderRef,
      amount: grandTotal,
      currency: 'INR',
      customer: { id: customerIdFrom(cfOrderRef), phone: phoneDigits },
      returnUrl: siteUrl ? `${siteUrl}/order-success?order_id={order_id}` : undefined,
      notifyUrl: siteUrl ? `${siteUrl}/api/payment/cashfree/webhook` : undefined,
    });

    // ── Persist the in-flight checkout snapshot (recovery + abandoned-cart) ──
    const supabase = createServiceRoleClient();
    const { error: pendingError } = await supabase
      .from('pending_orders')
      .upsert(
        {
          cf_order_id:            cfOrderRef,
          payment_provider:       'cashfree',
          user_id:                userId,
          status:                 'pending',
          subtotal,
          shipping_fee:           shippingFee,
          discount,
          // Carried through so the persist path can write orders.coupon_code
          // and count the redemption. Without it the applied code is lost
          // between payment and order creation.
          coupon_code:            appliedCouponCode,
          grand_total:            grandTotal,
          currency:               'INR',
          items_json:             lineItems,
          customer_name:          name,
          customer_email:         email,
          customer_phone:         phoneDigits,
          shipping_name:          sName,
          shipping_phone:         sPhone,
          shipping_email:         email,
          shipping_address_line1: sLine1,
          shipping_address_line2: String(shipping.addressLine2 ?? '') || null,
          shipping_city:          sCity,
          shipping_state:         sState,
          shipping_postal_code:   sPin,
          shipping_country:       'IN',
          /*
           * Ad attribution, captured HERE because this is the last moment the
           * browser is in the loop. The `_fbc`/`_fbp` cookies the Meta
           * Conversions API matches on live only in the browser, and the
           * request that ultimately confirms this payment may well be a
           * Cashfree webhook with no browser attached at all. Snapshotting it
           * onto the pending row is what lets the persist path report an
           * attributable server-side Purchase.
           *
           * Reporting metadata only — never read by pricing, payment or any
           * authorisation decision, so an attacker-supplied value costs
           * nothing beyond a wrong analytics row.
           */
          marketing_json:         readAttribution(request),
        },
        { onConflict: 'cf_order_id' }
      );

    /*
     * Fail CLOSED. The pending_orders row is the server-authoritative snapshot
     * that verify + webhook both resolve the payment against; without it a
     * completed payment can never become an order. Returning a usable
     * paymentSessionId here would let the customer pay into a checkout we
     * cannot reconcile — exactly the incident that migration 20260822000000
     * documents. The Cashfree order created above is simply left unpaid, which
     * is indistinguishable from an abandoned checkout and moves no money.
     */
    if (pendingError) {
      log.error('cashfree.create-order.pending_write_failed', {
        cfOrderRef,
        errorCode: pendingError.code,
        errorMessage: pendingError.message,
      });
      return apiError(
        requestId,
        'PENDING_WRITE_FAILED',
        'Unable to initiate payment. Please try again.',
        500
      );
    }

    return NextResponse.json({
      success: true,
      requestId,
      orderId: cfOrderRef,
      paymentSessionId: cf.paymentSessionId,
      mode: cashfreeMode(),
      /*
       * Returned so the browser's Meta Purchase event reports the amount
       * actually charged, including shipping, rather than a client-side cart
       * estimate. Reporting only, never an input: the charge is decided by the
       * Cashfree order created above from this same server-computed figure.
       */
      amount: grandTotal,
      currency: 'INR',
    });
  } catch (err) {
    log.error('cashfree.create-order.unhandled', err);
    const message = err instanceof Error ? err.message : 'Unable to initiate payment.';
    return apiError(requestId, 'CASHFREE_ERROR', message, 500);
  }
}
