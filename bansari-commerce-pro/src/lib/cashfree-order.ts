/**
 * cashfree-order.ts
 * -----------------
 * Server-side "confirm a Cashfree payment and persist the order" orchestration,
 * shared by the browser-triggered verify route and the Cashfree webhook so the
 * idempotent order-creation path exists exactly once.
 *
 * Payment truth is established SERVER-SIDE only: we fetch the order and its
 * payments from Cashfree and require order_status = PAID plus a SUCCESS
 * transaction. A browser "success" callback is never trusted as proof.
 *
 * Order creation goes through the same create_order_with_items RPC that
 * Razorpay uses — the single authority for order insert + inventory decrement
 * + idempotency — now extended (migration 20260820010000) to persist
 * cf_order_id / cf_payment_id atomically in that one INSERT.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import {
  getCashfreeOrder,
  getCashfreePayments,
} from '@/lib/cashfree';
import {
  sendOrderConfirmationEmail,
  sendOwnerNewOrderEmail,
} from '@/services/email.service';
import { recordCouponRedemption } from '@/services/coupon.service';

export type CashfreePersistResult =
  | { ok: true; orderId: string; orderNumber: string; idempotent: boolean }
  | { ok: false; code: string; message: string; status: number };

/** Order number format mirrors the Razorpay path (BC-<ts>-<rand>). */
function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BC-${ts}-${rand}`;
}

type DbOrderRow = { id: string; order_number: string };

/**
 * `cfOrderId` here is the MERCHANT order id — the `order_id` we generated and
 * sent to Cashfree, stored in pending_orders.cf_order_id and used both to query
 * Cashfree and (per migration 20260820000000's documented semantics) to
 * correlate the order. It is safe to call repeatedly: repeated calls, a webhook
 * arriving before/after the browser, and page refreshes all resolve to the same
 * single order via the pending 'consumed' short-circuit and the
 * orders.cf_payment_id unique index.
 */
export async function verifyAndPersistCashfreeOrder(
  cfOrderId: string,
  ctx: { requestId: string; source: 'browser' | 'webhook' }
): Promise<CashfreePersistResult> {
  const log = createLogger({ service: 'cashfree.persist', requestId: ctx.requestId });
  const supabase = createServiceRoleClient();

  // ── 1. Load the in-flight checkout snapshot (server-authoritative pricing) ──
  const { data: pending } = await supabase
    .from('pending_orders')
    .select('*')
    .eq('cf_order_id', cfOrderId)
    .maybeSingle();

  if (!pending) {
    log.warn('cashfree.persist.pending_missing', { cfOrderId, source: ctx.source });
    return { ok: false, code: 'PENDING_NOT_FOUND', message: 'Unknown checkout.', status: 404 };
  }

  // Already reconciled — return the existing order rather than re-persisting.
  if (pending.status === 'consumed') {
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('cf_order_id', cfOrderId)
      .maybeSingle();
    if (existing) {
      return {
        ok: true,
        orderId: existing.id,
        orderNumber: existing.order_number,
        idempotent: true,
      };
    }
  }

  // ── 2. Confirm payment with Cashfree — the ONLY proof of success ──
  const cfOrder = await getCashfreeOrder(cfOrderId);

  if (cfOrder.orderStatus !== 'PAID') {
    log.info('cashfree.persist.not_paid', { cfOrderId, orderStatus: cfOrder.orderStatus });
    return { ok: false, code: 'NOT_PAID', message: 'Payment not completed.', status: 409 };
  }

  // Amount and currency must match the snapshot computed at create time —
  // guards against a tampered or mismatched Cashfree order.
  const expectedTotal = Math.round(Number(pending.grand_total) * 100) / 100;
  const cfTotal = Math.round(cfOrder.orderAmount * 100) / 100;
  if (cfTotal !== expectedTotal) {
    log.error('cashfree.persist.amount_mismatch', { cfOrderId, expectedTotal, cfTotal });
    return { ok: false, code: 'AMOUNT_MISMATCH', message: 'Amount mismatch.', status: 409 };
  }
  if (cfOrder.orderCurrency !== (pending.currency ?? 'INR')) {
    log.error('cashfree.persist.currency_mismatch', {
      cfOrderId,
      expected: pending.currency,
      got: cfOrder.orderCurrency,
    });
    return { ok: false, code: 'CURRENCY_MISMATCH', message: 'Currency mismatch.', status: 409 };
  }

  const payments = await getCashfreePayments(cfOrderId);
  const success = payments.find((p) => p.paymentStatus === 'SUCCESS');
  if (!success || !success.cfPaymentId) {
    log.info('cashfree.persist.no_success_payment', { cfOrderId });
    return { ok: false, code: 'NO_SUCCESS_PAYMENT', message: 'No successful payment.', status: 409 };
  }
  const cfPaymentId = success.cfPaymentId;

  // ── 3. Idempotency: an order for this payment may already exist ──
  const { data: existingByPayment } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('cf_payment_id', cfPaymentId)
    .maybeSingle();
  if (existingByPayment) {
    return {
      ok: true,
      orderId: existingByPayment.id,
      orderNumber: existingByPayment.order_number,
      idempotent: true,
    };
  }

  // ── 4. Persist via the shared RPC (atomic insert + inventory decrement) ──
  const now = new Date().toISOString();
  const orderNumber = generateOrderNumber();

  const orderPayload = {
    order_number:       orderNumber,
    user_id:            pending.user_id ?? null,
    customer_name:      pending.customer_name,
    customer_email:     pending.customer_email,
    customer_phone:     pending.customer_phone ?? '',
    shipping_address: {
      name:        pending.shipping_name,
      phone:       pending.shipping_phone,
      email:       pending.shipping_email ?? null,
      line1:       pending.shipping_address_line1,
      line2:       pending.shipping_address_line2 ?? null,
      city:        pending.shipping_city,
      state:       pending.shipping_state,
      postal_code: pending.shipping_postal_code,
      country:     pending.shipping_country ?? 'IN',
    },
    currency:           pending.currency ?? 'INR',
    subtotal:           String(pending.subtotal),
    discount:           String(pending.discount ?? 0),
    // Copied from the snapshot, not recomputed: the discount was already
    // applied to the amount Cashfree charged, so re-deriving it here could
    // disagree with what the customer actually paid.
    coupon_code:        pending.coupon_code ?? null,
    shipping_fee:       String(pending.shipping_fee ?? 0),
    tax:                '0',
    grand_total:        String(pending.grand_total),
    // Cashfree identity — never written into razorpay_* columns.
    payment_provider:   'cashfree',
    payment_method:     'cashfree',
    payment_reference:  cfPaymentId,
    cf_order_id:        cfOrderId,
    cf_payment_id:      cfPaymentId,
    payment_status:     'paid',
    order_status:       'placed',
    payment_verified_at: now,
    paid_at:             now,
  };

  const items = Array.isArray(pending.items_json) ? pending.items_json : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsPayload = (items as any[]).map((li) => ({
    product_id:    li.productId,
    product_name:  li.productName,
    product_slug:  li.productSlug ?? '',
    product_sku:   li.productSku ?? '',
    product_image: li.productImage ?? '',
    unit_price:    li.unitPrice,
    quantity:      li.quantity,
    line_total:    li.lineTotal,
    variant_id:    li.variantId ?? null,
    variant_sku:   li.variantSku ?? null,
    variant_size:  li.variantSize ?? null,
  }));

  const rpcResult = await supabase.rpc('create_order_with_items', {
    p_order: orderPayload,
    p_items: itemsPayload,
  });
  const rpcErr = rpcResult.error;
  /*
   * create_order_with_items returns a single composite `public.orders` row
   * (`RETURN v_order`), which PostgREST surfaces as an OBJECT — not the array
   * a RETURNS TABLE/SETOF function would produce. Reading `rows[0]`
   * unconditionally yielded undefined and reported "Order not created" AFTER
   * the insert had already committed, orphaning the payment. Accept either
   * shape so the reader survives whichever variant the database has.
   */
  const rpcData = rpcResult.data as unknown;
  const rows: DbOrderRow[] | null = rpcData == null
    ? null
    : (Array.isArray(rpcData) ? rpcData : [rpcData]) as DbOrderRow[];

  if (rpcErr) {
    // 23505 = unique violation: the cf_payment_id index caught a concurrent
    // insert (browser + webhook racing). The other writer won — return theirs.
    if (rpcErr.code === '23505') {
      const { data: winner } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('cf_payment_id', cfPaymentId)
        .maybeSingle();
      if (winner) {
        return { ok: true, orderId: winner.id, orderNumber: winner.order_number, idempotent: true };
      }
    }
    log.error('cashfree.persist.rpc_failed', rpcErr);
    return { ok: false, code: 'DB_ERROR', message: rpcErr.message, status: 500 };
  }

  const order = rows?.[0] ?? null;
  if (!order) {
    log.error('cashfree.persist.rpc_no_row', { cfOrderId });
    return { ok: false, code: 'DB_ERROR', message: 'Order not created.', status: 500 };
  }

  /*
   * Guarantee the Cashfree identity is on the row. Migration 20260820010000
   * teaches create_order_with_items to persist cf_order_id / cf_payment_id in
   * the same INSERT, but that migration is not applied everywhere and older
   * RPC versions silently drop both columns. Without them the idempotency
   * pre-check above is blind, so a webhook retry would insert a SECOND order
   * for the same payment. Writing them here is redundant when the RPC already
   * did it (same values) and load-bearing when it did not.
   */
  const { error: cfIdError } = await supabase
    .from('orders')
    .update({
      cf_order_id: cfOrderId,
      cf_payment_id: cfPaymentId,
      /*
       * The RPC does not populate the V2 columns, so a fully paid order was
       * left reading payment_v2_status 'pending' — any admin screen keyed off
       * the V2 model saw it as unpaid. order_v2_status intentionally stays
       * 'pending': that is the legitimate start of the lifecycle, and the
       * merchant advances it via the confirm transition.
       */
      payment_v2_status: 'paid',
    })
    .eq('id', order.id);

  if (cfIdError) {
    // Not fatal — the order and the payment are both real — but it leaves the
    // duplicate guard disarmed for this order, so surface it loudly.
    log.error('cashfree.persist.cf_ids_not_written', {
      cfOrderId,
      orderId: order.id,
      errorCode: cfIdError.code,
      errorMessage: cfIdError.message,
    });
  }

  /*
   * Count the redemption once, here, on first persist only. The idempotent
   * returns above exit earlier, so a webhook arriving after the browser verify
   * cannot double-count a coupon toward its max_uses limit.
   *
   * Best-effort: the customer has already paid and the order exists, so a
   * failed counter update is logged rather than surfaced.
   */
  if (pending.coupon_code) {
    await recordCouponRedemption(pending.coupon_code, {
      orderId: order.id,
      requestId: ctx.requestId,
    });
  }

  // ── 5. Reconcile the pending row and write the audit trail ──
  await supabase.from('pending_orders').update({ status: 'consumed' }).eq('id', pending.id);
  await supabase.from('order_audit_trail').insert([
    { order_id: order.id, event: 'created', actor: 'system', metadata: { requestId: ctx.requestId, provider: 'cashfree', source: ctx.source } },
    { order_id: order.id, event: 'paid', actor: 'cashfree', metadata: { cf_payment_id: cfPaymentId, requestId: ctx.requestId } },
  ]);

  /*
   * Notifications, last and non-blocking. The order is already committed and
   * paid; email is a courtesy, never a precondition. Both sends are awaited so
   * they actually run before the serverless function is frozen, but any failure
   * is logged and swallowed — a bounced email must never turn a successful
   * payment into an error the customer sees.
   *
   * Only sent on first persist. The idempotent returns above exit earlier, so a
   * webhook arriving after the browser verify cannot re-send.
   */
  const emailPayload = {
    orderNumber:   order.order_number,
    customerName:  pending.customer_name,
    customerEmail: pending.customer_email,
    items: itemsPayload.map((li) => ({
      product_name: li.product_name,
      quantity:     Number(li.quantity),
      unit_price:   Number(li.unit_price),
      line_total:   Number(li.line_total),
    })),
    subtotal:    Number(pending.subtotal),
    shippingFee: Number(pending.shipping_fee ?? 0),
    discount:    Number(pending.discount ?? 0),
    grandTotal:  Number(pending.grand_total),
    shippingAddress: {
      addressLine1: pending.shipping_address_line1,
      addressLine2: pending.shipping_address_line2 ?? undefined,
      city:         pending.shipping_city,
      state:        pending.shipping_state,
      postalCode:   pending.shipping_postal_code,
    },
  };

  const [customerEmail, ownerEmail] = await Promise.allSettled([
    sendOrderConfirmationEmail(emailPayload),
    sendOwnerNewOrderEmail({
      ...emailPayload,
      customerPhone:    pending.customer_phone ?? undefined,
      paymentProvider:  'cashfree',
      paymentReference: cfPaymentId,
    }),
  ]);

  if (customerEmail.status === 'rejected' || ownerEmail.status === 'rejected') {
    log.warn('cashfree.persist.email_failed', {
      orderId: order.id,
      customer: customerEmail.status,
      owner: ownerEmail.status,
    });
  }

  log.info('cashfree.persist.ok', { cfOrderId, orderId: order.id, orderNumber: order.order_number, source: ctx.source });
  return { ok: true, orderId: order.id, orderNumber: order.order_number, idempotent: false };
}
