import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/service';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { validateCartItems } from '@/services/product.service';
import { sendOrderConfirmationEmail } from '@/services/email.service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'orders.create' });

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BC-${ts}-${rand}`;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const rLog = log.child({ requestId });
  const timer = rLog.startTimer('orders.create.duration');

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

    // --- Step 1: Field presence validation ---
    // All three Razorpay fields must be present as non-empty strings before
    // any other processing. Rejection here is safe — nothing has been read
    // from the DB yet.
    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'razorpay_payment_id is required.' },
        { status: 400 }
      );
    }
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'razorpay_order_id is required.' },
        { status: 400 }
      );
    }
    if (!razorpay_signature || typeof razorpay_signature !== 'string') {
      return NextResponse.json(
        { success: false, error: 'razorpay_signature is required.' },
        { status: 400 }
      );
    }

    // --- Step 2: Cryptographic HMAC verification ---
    // MUST run before ANY database read or write, including the idempotency
    // check. A valid signature proves the client received these IDs from
    // Razorpay after a real payment; without it, a caller with a known
    // payment_id could forge an order.
    //
    // verifyPaymentSignature uses RAZORPAY_KEY_SECRET (not the webhook
    // secret) over `${razorpay_order_id}|${razorpay_payment_id}` via
    // crypto.timingSafeEqual — never string equality.
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
      // Exit immediately. Nothing written to DB.
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature.' },
        { status: 400 }
      );
    }

    rLog.info('orders.create.signature_verified', {
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    rLog.info('orders.create.start', {
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    const supabase = createServiceRoleClient();

    // --- Step 3: Idempotency check ---
    // Runs only after signature is verified. The UNIQUE index on
    // razorpay_payment_id is the DB-level guard; this check provides a clean
    // 200 instead of a Postgres 23505 error.
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existing) {
      rLog.info('orders.create.idempotent', {
        orderId: existing.id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json(
        { success: true, orderId: existing.id, orderNumber: existing.order_number, idempotent: true },
        { status: 200 }
      );
    }

    // --- Step 4: Read pending_orders (server-side cart) ---
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
      name: string;
      phone: string;
      email: string | null;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };

    if (pending) {
      // Use server-computed data — never trust client-sent prices.
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
      // pending_orders row missing (race or retry after expiry).
      // Fall back to client-sent body: re-validate every item from DB.
      rLog.warn('orders.create.pending_orders_miss', { razorpayOrderId: razorpay_order_id });

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'items are required when pending_orders row is unavailable.' },
          { status: 400 }
        );
      }

      const validation = await validateCartItems(
        rawItems.map((i: Record<string, unknown>) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        }))
      );

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(' ') },
          { status: 400 }
        );
      }

      lineItems = validation.lineItems;
      subtotal = Math.round(lineItems.reduce((s, r) => s + r.lineTotal, 0) * 100) / 100;
      shippingFee = subtotal >= 2999 ? 0 : 99;
      discount = 0;
      grandTotal = Math.round((subtotal + shippingFee - discount) * 100) / 100;

      // Use client-sent customer/shipping as fallback only.
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
    // payment_verified_at is set here — AFTER cryptographic verification
    // in Step 2 above. It is never written without a valid HMAC check.
    const now = new Date().toISOString();

    // --- Step 5: Insert order ---
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_name: shippingData.name,
        shipping_phone: shippingData.phone,
        shipping_email: shippingData.email,
        shipping_address_line1: shippingData.addressLine1,
        shipping_address_line2: shippingData.addressLine2,
        shipping_city: shippingData.city,
        shipping_state: shippingData.state,
        shipping_postal_code: shippingData.postalCode,
        shipping_country: shippingData.country,
        billing_same_as_shipping: true,
        currency: 'INR',
        subtotal,
        discount,
        shipping_fee: shippingFee,
        tax: 0,
        grand_total: grandTotal,
        payment_provider: 'razorpay',
        payment_method: 'razorpay',
        payment_reference: razorpay_payment_id,
        razorpay_order_id,
        razorpay_payment_id,
        payment_status: 'paid',
        order_status: 'placed',
        // Written only after HMAC verification passed (Step 2).
        payment_verified_at: now,
        paid_at: now,
      })
      .select('id, order_number, customer_name, customer_email, grand_total, subtotal, shipping_fee, discount')
      .single();

    if (orderErr) {
      // 23505 = concurrent insert already succeeded (webhook beat the browser).
      if (orderErr.code === '23505') {
        const { data: winner } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('razorpay_payment_id', razorpay_payment_id)
          .maybeSingle();
        rLog.info('orders.create.race_winner', { orderId: winner?.id });
        return NextResponse.json(
          { success: true, orderId: winner?.id, orderNumber: winner?.order_number, idempotent: true },
          { status: 200 }
        );
      }
      rLog.error('orders.create.insert_failed', orderErr);
      return NextResponse.json(
        { success: false, error: orderErr.message },
        { status: 500 }
      );
    }

    rLog.info('orders.create.inserted', {
      orderId: order.id,
      orderNumber,
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // --- Step 6: Insert order_items ---
    if (lineItems.length > 0) {
      const itemRows = lineItems.map((li) => ({
        order_id: order.id,
        product_id: li.productId,
        product_name: li.productName,
        unit_price: li.unitPrice,
        quantity: li.quantity,
        line_total: li.lineTotal,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
      if (itemsErr) {
        rLog.warn('orders.create.items_failed', itemsErr, { orderId: order.id });
      }

      // --- Step 7: Decrement stock via RPC ---
      for (const li of lineItems) {
        const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
          p_product_id: li.productId,
          p_quantity: li.quantity,
        });
        if (stockErr) {
          rLog.warn('orders.create.stock_failed', stockErr, {
            orderId: order.id,
            productId: li.productId,
          });
        }
      }
    }

    // --- Step 8: Mark pending_orders as consumed (idempotency lock) ---
    if (pending) {
      await supabase
        .from('pending_orders')
        .update({ status: 'consumed' })
        .eq('id', pending.id);
    }

    // --- Step 9: Confirmation email (non-fatal) ---
    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: lineItems.map((li) => ({
          name: li.productName,
          quantity: li.quantity,
          price: li.unitPrice,
        })),
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

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err) {
    timer('error');
    log.error('orders.create.unhandled', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Order creation failed.' },
      { status: 500 }
    );
  }
}
