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
    const discount = 0;
    const grandTotal = round2(subtotal + shippingFee - discount);
    log.info('cashfree.create-order.pricing', { subtotal, shippingFee, grandTotal });

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
        },
        { onConflict: 'cf_order_id' }
      );

    if (pendingError) {
      log.warn('cashfree.create-order.pending_write_failed', {
        cfOrderRef,
        errorCode: pendingError.code,
        errorMessage: pendingError.message,
      });
    }

    return NextResponse.json({
      success: true,
      requestId,
      orderId: cfOrderRef,
      paymentSessionId: cf.paymentSessionId,
      mode: cashfreeMode(),
    });
  } catch (err) {
    log.error('cashfree.create-order.unhandled', err);
    const message = err instanceof Error ? err.message : 'Unable to initiate payment.';
    return apiError(requestId, 'CASHFREE_ERROR', message, 500);
  }
}
