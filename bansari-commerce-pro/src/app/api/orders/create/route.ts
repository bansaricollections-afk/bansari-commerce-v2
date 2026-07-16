import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/service';
import { createServerClient } from '@supabase/ssr';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { validateCartItems } from '@/services/product.service';
import { sendOrderConfirmationEmail } from '@/services/email.service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'orders.create' });

/**
 * Shape returned by the create_order_with_items RPC.
 * Mirrors the `orders` table columns that are read after insert.
 */
interface DbOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  subtotal: string;
  shipping_fee: string;
  discount: string;
  grand_total: string;
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BC-${ts}-${rand}`;
}

/** Resolve the authenticated user's ID, or null for guests. Never returns ''. */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
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
  const rLog = log.child({ requestId });
  const timer = rLog.startTimer('orders.create.duration');

  const rateLimitResponse = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    const {
      items: rawItems,
      customer,
      shipping,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body ?? {};

    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
      return apiError(requestId, 'MISSING_FIELD', 'razorpay_payment_id is required.', 400);
    }
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
      return apiError(requestId, 'MISSING_FIELD', 'razorpay_order_id is required.', 400);
    }
    if (!razorpay_signature || typeof razorpay_signature !== 'string') {
      return apiError(requestId, 'MISSING_FIELD', 'razorpay_signature is required.', 400);
    }

    const signatureValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!signatureValid) {
      rLog.warn('orders.create.signature_invalid', {
        razorpayOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return apiError(requestId, 'INVALID_SIGNATURE', 'Invalid payment signature.', 400);
    }

    rLog.info('orders.create.signature_verified', {
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // Resolve authenticated user ID (null for guests — NEVER empty string)
    const userId = await resolveUserId(request);
    rLog.info('orders.create.user_resolved', { authenticated: userId !== null });

    const supabase = createServiceRoleClient();

    // Idempotency: if order already exists for this payment, return it.
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existing) {
      rLog.info('orders.create.idempotent', { orderId: existing.id, paymentId: razorpay_payment_id });
      return NextResponse.json({
        success: true,
        requestId,
        orderId: existing.id,
        orderNumber: existing.order_number,
        idempotent: true,
      });
    }

    const { data: pending } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending')
      .maybeSingle();

    let lineItems: Array<{
      productId: number;
      productName: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }>;
    let subtotal: number;
    let shippingFee: number;
    let discount: number;
    let grandTotal: number;
    let customerName: string;
    let customerEmail: string;
    let customerPhone: string | null;
    let shippingData: {
      name: string; phone: string; email: string | null;
      addressLine1: string; addressLine2: string | null;
      city: string; state: string; postalCode: string; country: string;
    };

    if (pending) {
      lineItems = (pending.items_json ?? []) as typeof lineItems;
      subtotal = Number(pending.subtotal);
      shippingFee = Number(pending.shipping_fee);
      discount = Number(pending.discount);
      grandTotal = Number(pending.grand_total);
      customerName = pending.customer_name;
      customerEmail = pending.customer_email;
      customerPhone = pending.customer_phone ?? null;
      shippingData = {
        name: pending.shipping_name,
        phone: pending.shipping_phone,
        email: pending.shipping_email ?? null,
        addressLine1: pending.shipping_address_line1,
        addressLine2: pending.shipping_address_line2 ?? null,
        city: pending.shipping_city,
        state: pending.shipping_state,
        postalCode: pending.shipping_postal_code,
        country: pending.shipping_country,
      };
    } else {
      rLog.warn('orders.create.pending_orders_miss', { razorpayOrderId: razorpay_order_id });

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return apiError(requestId, 'MISSING_ITEMS', 'items are required when pending_orders row is unavailable.', 400);
      }

      const validation = await validateCartItems(
        rawItems.map((i: Record<string, unknown>) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        }))
      );

      if (!validation.valid) {
        return apiError(requestId, 'CART_INVALID', validation.errors.join(' '), 400);
      }

      lineItems = validation.lineItems;
      subtotal = Math.round(lineItems.reduce((s, r) => s + r.lineTotal, 0) * 100) / 100;
      shippingFee = subtotal >= 2999 ? 0 : 99;
      discount = 0;
      grandTotal = Math.round((subtotal + shippingFee - discount) * 100) / 100;

      customerName = customer?.name ?? 'Customer';
      customerEmail = customer?.email ?? '';
      customerPhone = customer?.phone ?? null;
      shippingData = {
        name: shipping?.name ?? customerName,
        phone: shipping?.phone ?? customerPhone ?? '',
        email: shipping?.email ?? null,
        addressLine1: shipping?.addressLine1 ?? '',
        addressLine2: shipping?.addressLine2 ?? null,
        city: shipping?.city ?? '',
        state: shipping?.state ?? '',
        postalCode: shipping?.postalCode ?? '',
        country: shipping?.country ?? 'IN',
      };
    }

    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    // P0 FIX: user_id is NULL for guests, auth UUID for authenticated users.
    // The create_order_with_items RPC accepts null via nullif coercion.
    const orderPayload = {
      order_number:             orderNumber,
      user_id:                  userId ?? null,
      customer_name:            customerName,
      customer_email:           customerEmail,
      customer_phone:           customerPhone ?? '',
      shipping_name:            shippingData.name,
      shipping_phone:           shippingData.phone,
      shipping_email:           shippingData.email ?? '',
      shipping_address_line1:   shippingData.addressLine1,
      shipping_address_line2:   shippingData.addressLine2 ?? '',
      shipping_city:            shippingData.city,
      shipping_state:           shippingData.state,
      shipping_postal_code:     shippingData.postalCode,
      billing_same_as_shipping: 'true',
      currency:                 'INR',
      subtotal:                 String(subtotal),
      discount:                 String(discount),
      shipping_fee:             String(shippingFee),
      tax:                      '0',
      grand_total:              String(grandTotal),
      payment_provider:         'razorpay',
      payment_method:           'razorpay',
      payment_reference:        razorpay_payment_id,
      razorpay_order_id:        razorpay_order_id,
      razorpay_payment_id:      razorpay_payment_id,
      payment_status:           'paid',
      order_status:             'placed',
      payment_verified_at:      now,
      paid_at:                  now,
    };

    const itemsPayload = lineItems.map((li) => ({
      product_id:   li.productId,
      product_name: li.productName,
      unit_price:   li.unitPrice,
      quantity:     li.quantity,
      line_total:   li.lineTotal,
    }));

    const { data: order, error: rpcErr } = await supabase
      .rpc<'create_order_with_items', { Args: { p_order: typeof orderPayload; p_items: typeof itemsPayload }; Returns: DbOrderRow }>(
        'create_order_with_items',
        { p_order: orderPayload, p_items: itemsPayload },
      )
      .returns<DbOrderRow>()
      .single();

    if (rpcErr) {
      if (rpcErr.code === '23505') {
        const { data: winner } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('razorpay_payment_id', razorpay_payment_id)
          .maybeSingle();
        rLog.info('orders.create.race_winner', { orderId: winner?.id });
        return NextResponse.json({
          success: true,
          requestId,
          orderId: winner?.id,
          orderNumber: winner?.order_number,
          idempotent: true,
        });
      }
      rLog.error('orders.create.rpc_failed', rpcErr);
      return apiError(requestId, 'DB_ERROR', rpcErr.message, 500);
    }

    rLog.info('orders.create.inserted', {
      orderId: order.id,
      orderNumber,
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      authenticated: userId !== null,
    });

    // Decrement stock (best-effort, outside order transaction)
    for (const li of lineItems) {
      const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
        p_product_id: li.productId,
        p_quantity: li.quantity,
      });
      if (stockErr) {
        rLog.warn('orders.create.stock_failed', stockErr, { orderId: order.id, productId: li.productId });
      }
    }

    if (pending) {
      await supabase
        .from('pending_orders')
        .update({ status: 'consumed' })
        .eq('id', pending.id);
    }

    // Write order audit trail
    const auditRows = [
      { order_id: order.id, event: 'created', actor: 'system', metadata: { requestId, authenticated: userId !== null } },
      { order_id: order.id, event: 'paid', actor: 'razorpay', metadata: { razorpay_payment_id, requestId } },
    ];
    await supabase.from('order_audit_trail').insert(auditRows);

    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: lineItems.map((li) => ({ name: li.productName, quantity: li.quantity, price: li.unitPrice })),
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shipping_fee),
        discount: Number(order.discount),
        grandTotal: Number(order.grand_total),
        shippingAddress: {
          addressLine1: shippingData.addressLine1,
          city: shippingData.city,
          state: shippingData.state,
          postalCode: shippingData.postalCode,
        },
      });
      rLog.info('orders.create.email.sent', { orderId: order.id });
    } catch (emailErr) {
      rLog.warn('orders.create.email.failed', emailErr, { orderId: order.id });
    }

    timer('info', { orderId: order.id, razorpayOrderId: razorpay_order_id });

    return NextResponse.json({ success: true, requestId, orderId: order.id, orderNumber: order.order_number });
  } catch (err) {
    timer('error');
    log.error('orders.create.unhandled', err);
    return apiError(requestId, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Order creation failed.', 500);
  }
}

const _c = crypto.randomUUID;
void _c;
