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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (rpcResult.data as any) as DbOrderRow[] | null;

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

  // ── 5. Reconcile the pending row and write the audit trail ──
  await supabase.from('pending_orders').update({ status: 'consumed' }).eq('id', pending.id);
  await supabase.from('order_audit_trail').insert([
    { order_id: order.id, event: 'created', actor: 'system', metadata: { requestId: ctx.requestId, provider: 'cashfree', source: ctx.source } },
    { order_id: order.id, event: 'paid', actor: 'cashfree', metadata: { cf_payment_id: cfPaymentId, requestId: ctx.requestId } },
  ]);

  log.info('cashfree.persist.ok', { cfOrderId, orderId: order.id, orderNumber: order.order_number, source: ctx.source });
  return { ok: true, orderId: order.id, orderNumber: order.order_number, idempotent: false };
}
