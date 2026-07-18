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

/** pending_orders row shape (only fields we use in recovery) */
type PendingOrderRow = {
  id: string;
  user_id: string | null;           // P0-FIX: null for guests, UUID for auth users
  items_json: PendingLineItem[] | null;
  subtotal: number | string;
  shipping_fee: number | string;
  discount: number | string;
  grand_total: number | string;
  currency: string | null;
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
 * P0 FIX — user_id ownership:
 *   - Full recovery: reads pending.user_id (UUID for auth users, null for guests)
 *   - Partial recovery: always null (no session available in async webhook context)
 *   - NEVER inserts empty string ''
 *
 * Stock deduction: performed after the RPC succeeds (same pattern as
 * browser checkout — best-effort, non-fatal on failure).
 *
 * Email: sent after stock deduction, non-fatal on failure.
 *
 * RPC chain note (postgrest-js 2.110.x):
 *   supabase.rpc() returns PostgrestBuilder when the Postgres function is NOT
 *   SETOF. PostgrestBuilder has .overrideTypes<T, { merge: false }>() but does
 *   NOT have .single() (which lives on PostgrestTransformBuilder). Use
 *   .overrideTypes<Order, { merge: false }>() as the terminal call and the
 *   returned data will be typed as Order | null.
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
      const typedPending = pending as PendingOrderRow;
      rLog.info('recovery.pending_orders.found', {
        pendingId: typedPending.id,
        hasUserId: typedPending.user_id !== null,
      });

      const lineItems = (typedPending.items_json ?? []) as PendingLineItem[];
      const orderNumber = generateOrderNumber();

      // P0 FIX: use pending.user_id (null for guests, UUID for auth users).
      // Never use empty string '' — the RPC coerces '' to null via nullif anyway,
      // but we pass the correct value explicitly for clarity and correctness.
      const resolvedUserId: string | null = typedPending.user_id ?? null;

      const orderPayload = {
        order_number:              orderNumber,
        user_id:                   resolvedUserId,
        customer_name:             typedPending.customer_name,
        customer_email:            typedPending.customer_email,
        customer_phone:            typedPending.customer_phone ?? '',
        shipping_name:             typedPending.shipping_name,
        shipping_phone:            typedPending.shipping_phone,
        shipping_email:            typedPending.shipping_email ?? '',
        shipping_address_line1:    typedPending.shipping_address_line1,
        shipping_address_line2:    typedPending.shipping_address_line2 ?? '',
        shipping_city:             typedPending.shipping_city,
        shipping_state:            typedPending.shipping_state,
        shipping_postal_code:      typedPending.shipping_postal_code,
        billing_same_as_shipping:  'true',
        currency:                  typedPending.currency ?? 'INR',
        subtotal:                  String(typedPending.subtotal),
        discount:                  String(typedPending.discount),
        shipping_fee:              String(typedPending.shipping_fee),
        tax:                       '0',
        grand_total:               String(typedPending.grand_total),
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
      // .overrideTypes<Order, { merge: false }>() is the correct terminal call
      // on PostgrestBuilder (the return of .rpc() for non-SETOF functions).
      // .single() does NOT exist on PostgrestBuilder in postgrest-js 2.110.x.
      const { data: order, error: rpcErr } = await supabase
        .rpc('create_order_with_items', {
          p_order: orderPayload,
          p_items: itemsPayload,
        })
        .overrideTypes<Order, { merge: false }>();

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
        rLog.error('recovery.rpc.failed', { error: rpcErr });
        return { recovered: false, error: rpcErr.message };
      }

      if (!order) return { recovered: false, error: 'RPC returned no data.' };

      // order is now typed as Order — no cast needed.
      rLog.info('recovery.order.created', {
        orderId: order.id,
        orderNumber,
        userId: resolvedUserId ?? undefined,
      });

      // --- Decrement stock (best-effort, outside the RPC transaction) ---
      for (const li of lineItems) {
        const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
          p_product_id: li.productId,
          p_quantity:   li.quantity,
        });
        if (stockErr) {
          rLog.warn('recovery.stock.decrement_failed', { error: stockErr, orderId: order.id, productId: li.productId });
        }
      }

      await supabase
        .from('pending_orders')
        .update({ status: 'recovered' })
        .eq('id', typedPending.id);

      try {
        await sendOrderConfirmationEmail({
          orderNumber:     order.order_number,
          customerName:    order.customer_name,
          customerEmail:   order.customer_email ?? undefined,
          items: lineItems.map((li) => ({
            product_name: li.productName,
            quantity: li.quantity,
            unit_price: li.unitPrice,
            line_total: li.lineTotal,
          })) as unknown as OrderItem[],
          subtotal:    Number(order.subtotal),
          shippingFee: Number(order.shipping_fee),
          discount:    Number(order.discount),
          grandTotal:  Number(order.grand_total),
          shippingAddress: {
            addressLine1: typedPending.shipping_address_line1,
            city:         typedPending.shipping_city,
            state:        typedPending.shipping_state,
            postalCode:   typedPending.shipping_postal_code,
          },
        });
        rLog.info('recovery.email.sent', { orderId: order.id });
      } catch (emailErr) {
        rLog.warn('recovery.email.failed', { error: emailErr, orderId: order.id });
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

    // P0 FIX: partial recovery has no session context — user_id is always null.
    // The payment arrived asynchronously; there is no JWT available.
    // DO NOT use empty string ''. NULL is the correct value for unknown ownership.
    const partialOrderPayload = {
      order_number:              orderNumber,
      user_id:                   null,
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

    // Same fix as Priority 1: use .overrideTypes<Order, { merge: false }>()
    // instead of .single() which does not exist on PostgrestBuilder.
    const { data: partialOrder, error: partialErr } = await supabase
      .rpc('create_order_with_items', {
        p_order: partialOrderPayload,
        p_items: [],
      })
      .overrideTypes<Order, { merge: false }>();

    if (partialErr) {
      if (partialErr.code === '23505') {
        const { data: winner } = await supabase
          .from('orders')
          .select('id')
          .eq('razorpay_payment_id', payment.id)
          .maybeSingle();
        return { recovered: true, orderId: winner?.id };
      }
      rLog.error('recovery.partial.rpc.failed', { error: partialErr });
      return { recovered: false, error: partialErr.message };
    }

    // partialOrder is now typed as Order | null — no cast needed.
    rLog.warn('recovery.partial.created', {
      orderId: partialOrder?.id,
      note: 'MISSING shipping address and items. Admin must follow up.',
    });

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
      rLog.warn('recovery.partial.email_failed', { error: emailErr });
    }

    return { recovered: true, orderId: partialOrder?.id };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rLog.error('recovery.unhandled', err);
    return { recovered: false, error: message };
  }
}
