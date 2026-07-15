import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { sendOrderConfirmationEmail } from '@/services/email.service';

const log = createLogger({ service: 'order.service' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'placed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_name: string;
  shipping_phone: string;
  shipping_email: string | null;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  grand_total: number;
  currency: string;
  payment_provider: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  product_id: number | null;
  product_name: string;
  product_slug: string | null;
  product_sku: string | null;
  product_image: string | null;
  variant_color: string | null;
  variant_size: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

/**
 * RazorpayPaymentEntity — fields we use from the Razorpay payment object
 * (webhook payload and Fetch Payment API response).
 */
export type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;  // paise
  currency: string;
  status: string;
  contact?: string;
  email?: string;
  description?: string;
  notes?: Record<string, string>;
};

/** A single line item as stored in pending_orders.items_json */
type PendingLineItem = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getOrders(): Promise<Order[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OrderWithItems | null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new Error(`Invalid order status: ${status}`);
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('orders').update({ order_status: status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * updatePaymentStatusFromWebhook
 *
 * Updates the payment_status column for the order matching razorpayPaymentId.
 * Returns { updated: true } when a row was found and updated.
 * Returns { updated: false } when no matching order exists (recovery needed).
 */
export async function updatePaymentStatusFromWebhook(
  razorpayPaymentId: string,
  status: 'paid' | 'failed'
): Promise<{ updated: boolean }> {
  const supabase = createServiceRoleClient();

  const updatePayload: Record<string, unknown> = { payment_status: status };
  if (status === 'paid') updatePayload.paid_at = new Date().toISOString();

  let query = supabase
    .from('orders')
    .update(updatePayload)
    .eq('razorpay_payment_id', razorpayPaymentId);

  // Never downgrade a paid order to failed (race condition guard).
  if (status === 'failed') query = query.neq('payment_status', 'paid');

  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw new Error(error.message);

  return { updated: !!data };
}

// ---------------------------------------------------------------------------
// Webhook recovery — helpers
// ---------------------------------------------------------------------------

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BC-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// recoverOrderFromWebhook
// ---------------------------------------------------------------------------

/**
 * Called when payment.captured arrives but no order row exists.
 *
 * Uses the SAME create_order_with_items() RPC as the browser checkout path,
 * making recovery fully atomic: both the orders INSERT and the order_items
 * INSERT are wrapped in the RPC's implicit PL/pgSQL transaction.
 *
 * Recovery priority:
 *   1. pending_orders (full cart + shipping + customer data)
 *   2. Razorpay payment notes (partial — no items, no shipping address)
 *
 * Idempotent:
 *   - Checks orders table before any write.
 *   - Catches 23505 (unique_violation) from the RPC for concurrent deliveries.
 *
 * Stock deduction: performed after the RPC succeeds (same pattern as
 * browser checkout — best-effort, non-fatal on failure).
 *
 * Email: sent after stock deduction, non-fatal on failure.
 */
export async function recoverOrderFromWebhook(
  payment: RazorpayPaymentEntity
): Promise<{ recovered: boolean; orderId?: string; error?: string }> {
  const supabase = createServiceRoleClient();
  const rLog = log.child({ paymentId: payment.id, razorpayOrderId: payment.order_id });

  try {
    // --- Idempotency check ---
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('razorpay_payment_id', payment.id)
      .maybeSingle();

    if (existingOrder) {
      rLog.info('recovery.already_exists', { orderId: existingOrder.id });
      return { recovered: true, orderId: existingOrder.id };
    }

    const now = new Date().toISOString();

    // -----------------------------------------------------------------------
    // Priority 1: Full recovery from pending_orders
    // -----------------------------------------------------------------------
    const { data: pending } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('razorpay_order_id', payment.order_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pending) {
      rLog.info('recovery.pending_orders.found', { pendingId: pending.id });

      const lineItems = (pending.items_json ?? []) as PendingLineItem[];
      const orderNumber = generateOrderNumber();

      // Build payloads in the same shape as the browser checkout path.
      const orderPayload = {
        order_number:              orderNumber,
        user_id:                   '',
        customer_name:             pending.customer_name,
        customer_email:            pending.customer_email,
        customer_phone:            pending.customer_phone ?? '',
        shipping_name:             pending.shipping_name,
        shipping_phone:            pending.shipping_phone,
        shipping_email:            pending.shipping_email ?? '',
        shipping_address_line1:    pending.shipping_address_line1,
        shipping_address_line2:    pending.shipping_address_line2 ?? '',
        shipping_city:             pending.shipping_city,
        shipping_state:            pending.shipping_state,
        shipping_postal_code:      pending.shipping_postal_code,
        billing_same_as_shipping:  'true',
        currency:                  pending.currency ?? 'INR',
        subtotal:                  String(pending.subtotal),
        discount:                  String(pending.discount),
        shipping_fee:              String(pending.shipping_fee),
        tax:                       '0',
        grand_total:               String(pending.grand_total),
        payment_provider:          'razorpay',
        payment_method:            'razorpay-webhook-recovery',
        payment_reference:         payment.id,
        razorpay_order_id:         payment.order_id ?? '',
        razorpay_payment_id:       payment.id,
        payment_status:            'paid',
        order_status:              'placed',
        payment_verified_at:       now,
        paid_at:                   now,
      };

      const itemsPayload = lineItems.map((li) => ({
        product_id:   li.productId,
        product_name: li.productName,
        unit_price:   li.unitPrice,
        quantity:     li.quantity,
        line_total:   li.lineTotal,
      }));

      // --- Atomic RPC call — identical to browser checkout path ---
      const { data: order, error: rpcErr } = await supabase
        .rpc('create_order_with_items', {
          p_order: orderPayload,
          p_items: itemsPayload,
        })
        .single();

      if (rpcErr) {
        // 23505: concurrent webhook delivery already won the race.
        if (rpcErr.code === '23505') {
          const { data: winner } = await supabase
            .from('orders')
            .select('id')
            .eq('razorpay_payment_id', payment.id)
            .maybeSingle();
          rLog.info('recovery.race_winner', { orderId: winner?.id });
          return { recovered: true, orderId: winner?.id };
        }
        rLog.error('recovery.rpc.failed', rpcErr);
        return { recovered: false, error: rpcErr.message };
      }

      if (!order) return { recovered: false, error: 'RPC returned no data.' };

      rLog.info('recovery.order.created', { orderId: order.id, orderNumber });

      // --- Decrement stock (best-effort, outside the RPC transaction) ---
      for (const li of lineItems) {
        const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
          p_product_id: li.productId,
          p_quantity:   li.quantity,
        });
        if (stockErr) {
          rLog.warn('recovery.stock.decrement_failed', stockErr, {
            orderId:   order.id,
            productId: li.productId,
          });
        }
      }

      // --- Mark pending_orders as recovered ---
      await supabase
        .from('pending_orders')
        .update({ status: 'recovered' })
        .eq('id', pending.id);

      // --- Send confirmation email (non-fatal) ---
      try {
        await sendOrderConfirmationEmail({
          orderNumber:     order.order_number,
          customerName:    order.customer_name,
          customerEmail:   order.customer_email,
          items: lineItems.map((li) => ({
            name:     li.productName,
            quantity: li.quantity,
            price:    li.unitPrice,
          })),
          subtotal:    Number(order.subtotal),
          shippingFee: Number(order.shipping_fee),
          discount:    Number(order.discount),
          grandTotal:  Number(order.grand_total),
          shippingAddress: {
            addressLine1: pending.shipping_address_line1,
            city:         pending.shipping_city,
            state:        pending.shipping_state,
            postalCode:   pending.shipping_postal_code,
          },
        });
        rLog.info('recovery.email.sent', { orderId: order.id });
      } catch (emailErr) {
        rLog.warn('recovery.email.failed', emailErr, { orderId: order.id });
      }

      return { recovered: true, orderId: order.id };
    }

    // -----------------------------------------------------------------------
    // Priority 2: Partial recovery from Razorpay payment notes
    // (browser crashed before create-order returned — no pending_orders row)
    // -----------------------------------------------------------------------
    rLog.warn('recovery.pending_orders.not_found', {
      note: 'Partial recovery only — missing items and shipping address.',
    });

    const grandTotal     = Math.round((payment.amount / 100) * 100) / 100;
    const customerEmail  = payment.email ?? 'unknown@bansaricollections.com';
    const customerPhone  = payment.contact ?? '';
    const customerName   = payment.notes?.customer_name ?? 'Customer';
    const orderNumber    = generateOrderNumber();

    // Partial recovery has no items, so p_items is an empty array.
    // create_order_with_items() accepts an empty items array gracefully
    // (the inner INSERT … SELECT produces zero rows, which is fine).
    const partialOrderPayload = {
      order_number:              orderNumber,
      user_id:                   '',
      customer_name:             customerName,
      customer_email:            customerEmail,
      customer_phone:            customerPhone,
      shipping_name:             customerName,
      shipping_phone:            customerPhone,
      shipping_email:            customerEmail,
      shipping_address_line1:    '[Pending — webhook recovery]',
      shipping_address_line2:    '',
      shipping_city:             '',
      shipping_state:            '',
      shipping_postal_code:      '',
      billing_same_as_shipping:  'true',
      currency:                  payment.currency ?? 'INR',
      subtotal:                  String(grandTotal),
      discount:                  '0',
      shipping_fee:              '0',
      tax:                       '0',
      grand_total:               String(grandTotal),
      payment_provider:          'razorpay',
      payment_method:            'razorpay-webhook-recovery-partial',
      payment_reference:         payment.id,
      razorpay_order_id:         payment.order_id ?? '',
      razorpay_payment_id:       payment.id,
      payment_status:            'paid',
      order_status:              'placed',
      payment_verified_at:       now,
      paid_at:                   now,
    };

    const { data: partialOrder, error: partialErr } = await supabase
      .rpc('create_order_with_items', {
        p_order: partialOrderPayload,
        p_items: [],
      })
      .single();

    if (partialErr) {
      if (partialErr.code === '23505') {
        const { data: winner } = await supabase
          .from('orders')
          .select('id')
          .eq('razorpay_payment_id', payment.id)
          .maybeSingle();
        return { recovered: true, orderId: winner?.id };
      }
      rLog.error('recovery.partial.rpc.failed', partialErr);
      return { recovered: false, error: partialErr.message };
    }

    rLog.warn('recovery.partial.created', {
      orderId: partialOrder?.id,
      note: 'MISSING shipping address and items. Admin must follow up.',
    });

    // Best-effort partial email.
    try {
      if (customerEmail !== 'unknown@bansaricollections.com') {
        await sendOrderConfirmationEmail({
          orderNumber:  partialOrder?.order_number ?? orderNumber,
          customerName,
          customerEmail,
          items:        [],
          subtotal:     grandTotal,
          shippingFee:  0,
          discount:     0,
          grandTotal,
          shippingAddress: {
            addressLine1: 'Please contact us to confirm your delivery address.',
            city:         '',
            state:        '',
            postalCode:   '',
          },
        });
      }
    } catch (emailErr) {
      rLog.warn('recovery.partial.email_failed', emailErr);
    }

    return { recovered: true, orderId: partialOrder?.id };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rLog.error('recovery.unhandled', err);
    return { recovered: false, error: message };
  }
}
