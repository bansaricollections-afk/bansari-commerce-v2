import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { getRazorpay } from '@/lib/razorpay';
import { validateCartItems, type CartItem } from '@/services/product.service';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createServerClient } from '@supabase/ssr';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING_FEE = 99;
const MAX_ITEMS = 50;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function requireString(value: unknown, _field: string): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function parseItems(raw: unknown): CartItem[] | string {
  if (!Array.isArray(raw) || raw.length === 0)
    return 'items must be a non-empty array.';
  if (raw.length > MAX_ITEMS)
    return `Cart may not exceed ${MAX_ITEMS} distinct products.`;

  const items: CartItem[] = [];
  for (const [i, el] of raw.entries()) {
    if (!el || typeof el !== 'object')
      return `Item at index ${i} is invalid.`;
    const { productId, quantity } = el as Record<string, unknown>;
    if (!Number.isInteger(productId) || (productId as number) <= 0)
      return `Item at index ${i} has an invalid productId.`;
    if (!Number.isInteger(quantity) || (quantity as number) <= 0)
      return `Item at index ${i} has an invalid quantity.`;
    items.push({ productId: productId as number, quantity: quantity as number });
  }
  return items;
}

type CustomerInput = { name: string; email: string; phone: string };
type ShippingInput = {
  name: string; phone: string; email?: string;
  addressLine1: string; addressLine2?: string;
  city: string; state: string; postalCode: string; country?: string;
};

function parseCustomer(raw: unknown): CustomerInput | string {
  if (!raw || typeof raw !== 'object') return 'customer is required.';
  const c = raw as Record<string, unknown>;
  const name = requireString(c.name, 'customer.name');
  if (!name) return 'customer.name is required.';
  const email = requireString(c.email, 'customer.email');
  if (!email) return 'customer.email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'customer.email is not a valid email address.';
  const phone = requireString(c.phone, 'customer.phone');
  if (!phone) return 'customer.phone is required.';
  return { name, email, phone };
}

function parseShipping(raw: unknown): ShippingInput | string {
  if (!raw || typeof raw !== 'object') return 'shipping is required.';
  const s = raw as Record<string, unknown>;
  const name = requireString(s.name, 'shipping.name');
  if (!name) return 'shipping.name is required.';
  const phone = requireString(s.phone, 'shipping.phone');
  if (!phone) return 'shipping.phone is required.';
  const addressLine1 = requireString(s.addressLine1, 'shipping.addressLine1');
  if (!addressLine1) return 'shipping.addressLine1 is required.';
  const city = requireString(s.city, 'shipping.city');
  if (!city) return 'shipping.city is required.';
  const state = requireString(s.state, 'shipping.state');
  if (!state) return 'shipping.state is required.';
  const postalCode = requireString(s.postalCode, 'shipping.postalCode');
  if (!postalCode) return 'shipping.postalCode is required.';
  return {
    name, phone,
    email: requireString(s.email, 'shipping.email') ?? undefined,
    addressLine1,
    addressLine2: requireString(s.addressLine2, 'shipping.addressLine2') ?? undefined,
    city, state, postalCode,
    country: requireString(s.country, 'shipping.country') ?? 'IN',
  };
}

/**
 * P0-3: Resolve the authenticated user's ID from the server-side JWT.
 * Returns null for unauthenticated/guest users. Never returns ''.
 * Used to populate pending_orders.user_id for ownership tracking in recovery.
 */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* read-only in API route */ },
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
  const log = createLogger({ service: 'create-order', requestId });
  const timer = log.startTimer('create-order.duration');

  const rateLimitResponse = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    const itemsResult = parseItems(body?.items);
    if (typeof itemsResult === 'string') {
      log.warn('create-order.validation.items', { error: itemsResult });
      return apiError(requestId, 'VALIDATION_ERROR', itemsResult, 400);
    }

    const customerResult = parseCustomer(body?.customer);
    if (typeof customerResult === 'string') {
      log.warn('create-order.validation.customer', { error: customerResult });
      return apiError(requestId, 'VALIDATION_ERROR', customerResult, 400);
    }

    const shippingResult = parseShipping(body?.shipping);
    if (typeof shippingResult === 'string') {
      log.warn('create-order.validation.shipping', { error: shippingResult });
      return apiError(requestId, 'VALIDATION_ERROR', shippingResult, 400);
    }

    const customer = customerResult;
    const shipping = shippingResult;
    const couponCode =
      typeof body?.coupon === 'string' && body.coupon.trim().length > 0
        ? body.coupon.trim()
        : null;

    const cartValidation = await validateCartItems(itemsResult);
    if (!cartValidation.valid) {
      log.warn('create-order.validation.cart', { errors: cartValidation.errors });
      return apiError(requestId, 'CART_INVALID', cartValidation.errors.join(' '), 400);
    }

    const { lineItems } = cartValidation;

    const subtotal    = round2(lineItems.reduce((s, r) => s + r.lineTotal, 0));
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const discount    = 0;
    const grandTotal  = round2(subtotal + shippingFee - discount);
    const amountPaise = Math.round(grandTotal * 100);
    const currency    = 'INR';

    log.info('create-order.pricing', { subtotal, shippingFee, discount, grandTotal });

    // P0-3: Resolve user_id BEFORE creating the Razorpay order.
    // This ensures pending_orders carries the correct ownership.
    const userId = await resolveUserId(request);
    log.info('create-order.user_resolved', { authenticated: userId !== null });

    const razorpay  = getRazorpay();
    const rzpOrder  = await razorpay.orders.create({
      amount:   amountPaise,
      currency,
      receipt:  `BC-${Date.now()}`,
      notes: {
        customer_name:  customer.name,
        customer_email: customer.email,
        subtotal:       String(subtotal),
        shipping_fee:   String(shippingFee),
        grand_total:    String(grandTotal),
        item_count:     String(lineItems.length),
      },
    });

    log.info('create-order.razorpay.created', { razorpayOrderId: rzpOrder.id, amountPaise });

    const supabase = createServiceRoleClient();
    const { error: pendingError } = await supabase
      .from('pending_orders')
      .upsert(
        {
          razorpay_order_id:      rzpOrder.id,
          user_id:                userId,   // P0-3: null for guests, UUID for auth users
          status:                 'pending',
          subtotal,
          shipping_fee:           shippingFee,
          discount,
          grand_total:            grandTotal,
          currency,
          coupon_code:            couponCode,
          items_json:             lineItems,
          customer_name:          customer.name,
          customer_email:         customer.email,
          customer_phone:         customer.phone,
          shipping_name:          shipping.name,
          shipping_phone:         shipping.phone,
          shipping_email:         shipping.email ?? null,
          shipping_address_line1: shipping.addressLine1,
          shipping_address_line2: shipping.addressLine2 ?? null,
          shipping_city:          shipping.city,
          shipping_state:         shipping.state,
          shipping_postal_code:   shipping.postalCode,
          shipping_country:       shipping.country ?? 'IN',
        },
        { onConflict: 'razorpay_order_id' }
      );

    if (pendingError) {
      log.warn('create-order.pending_orders.write_failed', pendingError, { razorpayOrderId: rzpOrder.id });
    } else {
      log.info('create-order.pending_orders.saved', { razorpayOrderId: rzpOrder.id, userId });
    }

    timer('info', { razorpayOrderId: rzpOrder.id });

    return NextResponse.json({
      success: true,
      requestId,
      order:   rzpOrder,
      pricing: { subtotal, shippingFee, discount, grandTotal },
    });
  } catch (error) {
    timer('error', { error: error instanceof Error ? error.message : String(error) });
    log.error('create-order.unhandled', error);
    return apiError(
      requestId,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unable to create payment order.',
      500
    );
  }
}

export { generateRequestId as _requestId };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _crypto = crypto;
