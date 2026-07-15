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
// Webhook recovery
// ---------------------------------------------------------------------------

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BC-${ts}-${rand}`;
}

/**
 * recoverOrderFromWebhook
 *
 * Called when payment.captured arrives but no order row exists.
 *
 * Recovery priority:
 *   1. Read pending_orders (written by create-order before the modal opened).
 *      This gives us the complete order: items, prices, shipping, customer.
 *      Creates order + order_items + decrements stock + sends email.
 *
 *   2. If pending_orders row is missing (browser crashed before create-order
 *      returned), fall back to partial recovery from Razorpay payment notes.
 *      Creates order with empty shipping address; logs admin warning.
 *      Does NOT decrement stock (no item data available).
 *
 * Idempotent: checks orders table + pending_orders.status before any write.
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

    // --- Priority 1: Full recovery from pending_orders ---
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

      const { data: order, error: insertErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: null,

          customer_name: pending.customer_name,
          customer_email: pending.customer_email,
          customer_phone: pending.customer_phone ?? null,

          shipping_name: pending.shipping_name,
          shipping_phone: pending.shipping_phone,
          shipping_email: pending.shipping_email ?? null,
          shipping_address_line1: pending.shipping_address_line1,
          shipping_address_line2: pending.shipping_address_line2 ?? null,
          shipping_city: pending.shipping_city,
          shipping_state: pending.shipping_state,
          shipping_postal_code: pending.shipping_postal_code,
          shipping_country: pending.shipping_country,
          billing_same_as_shipping: true,

          currency: pending.currency,
          subtotal: pending.subtotal,
          discount: pending.discount,
          shipping_fee: pending.shipping_fee,
          tax: 0,
          grand_total: pending.grand_total,

          payment_provider: 'razorpay',
          payment_method: 'razorpay-webhook-recovery',
          payment_reference: payment.id,
          razorpay_order_id: payment.order_id ?? null,
          razorpay_payment_id: payment.id,
          payment_status: 'paid',
          order_status: 'placed',

          payment_verified_at: now,
          paid_at: now,
        })
        .select('id, order_number, customer_name, customer_email, grand_total, subtotal, shipping_fee, discount')
        .single();

      if (insertErr) {
        // 23505 = unique_violation: concurrent webhook delivery already inserted.
        if (insertErr.code === '23505') {
          const { data: winner } = await supabase
            .from('orders')
            .select('id')
            .eq('razorpay_payment_id', payment.id)
            .maybeSingle();
          return { recovered: true, orderId: winner?.id };
        }
        rLog.error('recovery.order_insert.failed', insertErr);
        return { recovered: false, error: insertErr.message };
      }

      if (!order) return { recovered: false, error: 'Order insert returned no data.' };

      rLog.info('recovery.order.created', { orderId: order.id, orderNumber });

      // --- Insert order_items ---
      if (lineItems.length > 0) {
        const orderItemRows = lineItems.map((li) => ({
          order_id: order.id,
          product_id: li.productId,
          product_name: li.productName,
          unit_price: li.unitPrice,
          quantity: li.quantity,
          line_total: li.lineTotal,
        }));

        const { error: itemsErr } = await supabase
          .from('order_items')
          .insert(orderItemRows);

        if (itemsErr) {
          rLog.warn('recovery.order_items.failed', itemsErr, { orderId: order.id });
          // Non-fatal: order row exists; items can be reconstructed from pending_orders.
        } else {
          rLog.info('recovery.order_items.inserted', { orderId: order.id, count: lineItems.length });
        }

        // --- Decrement stock ---
        for (const li of lineItems) {
          const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
            p_product_id: li.productId,
            p_quantity: li.quantity,
          });

          if (stockErr) {
            rLog.warn('recovery.stock.decrement_failed', stockErr, {
              orderId: order.id,
              productId: li.productId,
              quantity: li.quantity,
            });
            // Log but continue: partial stock failure is better than lost order.
          }
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
            addressLine1: pending.shipping_address_line1,
            city: pending.shipping_city,
            state: pending.shipping_state,
            postalCode: pending.shipping_postal_code,
          },
        });
        rLog.info('recovery.email.sent', { orderId: order.id });
      } catch (emailErr) {
        rLog.warn('recovery.email.failed', emailErr, { orderId: order.id });
      }

      return { recovered: true, orderId: order.id };
    }

    // --- Priority 2: Partial recovery from Razorpay notes ---
    rLog.warn('recovery.pending_orders.not_found', {
      note: 'Browser may have crashed before create-order returned. Partial recovery only.',
    });

    const grandTotal = Math.round((payment.amount / 100) * 100) / 100;
    const customerEmail = payment.email ?? 'unknown@bansaricollections.com';
    const customerPhone = payment.contact ?? '';
    const customerName = payment.notes?.customer_name ?? 'Customer';
    const orderNumber = generateOrderNumber();

    const { data: partialOrder, error: partialErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        shipping_name: customerName,
        shipping_phone: customerPhone || '',
        shipping_email: customerEmail,
        shipping_address_line1: '[Pending — webhook recovery]',
        shipping_address_line2: null,
        shipping_city: '',
        shipping_state: '',
        shipping_postal_code: '',
        shipping_country: 'IN',
        billing_same_as_shipping: true,
        currency: payment.currency ?? 'INR',
        subtotal: grandTotal,
        discount: 0,
        shipping_fee: 0,
        tax: 0,
        grand_total: grandTotal,
        payment_provider: 'razorpay',
        payment_method: 'razorpay-webhook-recovery-partial',
        payment_reference: payment.id,
        razorpay_order_id: payment.order_id ?? null,
        razorpay_payment_id: payment.id,
        payment_status: 'paid',
        order_status: 'placed',
        payment_verified_at: now,
        paid_at: now,
      })
      .select('id, order_number')
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
      rLog.error('recovery.partial.failed', partialErr);
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
          orderNumber: partialOrder?.order_number ?? orderNumber,
          customerName,
          customerEmail,
          items: [],
          subtotal: grandTotal,
          shippingFee: 0,
          discount: 0,
          grandTotal,
          shippingAddress: {
            addressLine1: 'Please contact us to confirm your delivery address.',
            city: '',
            state: '',
            postalCode: '',
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
