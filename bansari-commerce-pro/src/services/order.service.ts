import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Order read/write operations for admin use.
 *
 * Uses the service-role client, not the regular server/browser client.
 * RLS on `orders`/`order_items` only allows a customer to SELECT their own
 * rows (`user_id = auth.uid()`), and orders are currently created with
 * `user_id: null` (no customer-account system exists yet) — so no
 * authenticated session, including an admin's, can read or write any order
 * row under that policy alone. There is also no authenticated write policy
 * of any kind, so status updates from the admin UI can only happen through
 * a trusted server-side path using this service-role client.
 *
 * SERVER-SIDE USE ONLY — never import this into a Client Component, the
 * service-role key must never reach the browser. `updateOrderStatus` is
 * called only from `src/app/api/admin/orders/status/route.ts`, which the
 * new OrderStatusSelect Client Component calls over `fetch()`, following
 * the same API route → service layer → service-role client pattern
 * already used by `/api/orders/create`.
 */

// The DB's order_status CHECK constraint only permits these exact lowercase
// values — this is the single source of truth both this service and
// OrderStatusSelect's display labels are built from.
export const ORDER_STATUSES = [
  "placed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export async function getOrders(): Promise<Order[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Order[];
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OrderWithItems | null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("orders")
    .update({ order_status: status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePaymentStatusFromWebhook(
  razorpayPaymentId: string,
  status: "paid" | "failed"
): Promise<{ updated: boolean }> {
  const supabase = createServiceRoleClient();

  const updatePayload: Record<string, unknown> = {
    payment_status: status,
  };

  if (status === "paid") {
    updatePayload.paid_at = new Date().toISOString();
  }

  let query = supabase
    .from("orders")
    .update(updatePayload)
    .eq("razorpay_payment_id", razorpayPaymentId);

  if (status === "failed") {
    query = query.neq("payment_status", "paid");
  }

  const { data, error } = await query
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    updated: !!data,
  };
}

/**
 * RazorpayPaymentEntity — the shape of `payment.entity` inside a
 * Razorpay webhook payload, as well as the Razorpay Fetch Payment API
 * response.  Only the fields we actually use are declared.
 */
export type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;          // in paise
  currency: string;
  status: string;
  contact?: string;        // phone, may include country code prefix
  email?: string;
  description?: string;
  notes?: Record<string, string>;
};

/**
 * recoverOrderFromWebhook
 *
 * Called by the webhook handler when `payment.captured` arrives but no
 * order row exists for that payment id.  This happens when the customer's
 * browser closed (or crashed) between Razorpay capturing the payment and
 * the client calling /api/orders/create.
 *
 * Creates a minimal-but-complete order row from the Razorpay payment
 * entity.  Shipping address will be empty because the browser never
 * submitted it — this is logged and the order is marked with
 * payment_method = 'razorpay-webhook-recovery' so admin can identify and
 * follow up to confirm the delivery address.
 *
 * Does NOT decrement stock — that is logged as a manual-review item,
 * consistent with the existing stock-error handling in orders/create.
 *
 * Returns { recovered: true, orderId } on success.
 * Returns { recovered: false, error } on failure — never throws.
 */
export async function recoverOrderFromWebhook(
  payment: RazorpayPaymentEntity
): Promise<{ recovered: boolean; orderId?: string; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    // Idempotency: bail out early if an order already exists for this
    // payment id.  The unique index prevents a duplicate insert, but
    // checking first lets us return a clean result without relying on
    // catching Postgres error code 23505.
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_payment_id", payment.id)
      .maybeSingle();

    if (existing) {
      return { recovered: true, orderId: existing.id };
    }

    // Derive what we can from the payment entity.
    const grandTotal = Math.round((payment.amount / 100) * 100) / 100;
    const customerEmail = payment.email ?? "unknown@bansaricollections.com";
    const customerPhone = payment.contact ?? "";
    // Razorpay contact may include a +91 prefix — strip it for the name
    // fallback; we cannot infer a real name from payment alone.
    const customerName = payment.notes?.customer_name ?? "Customer";
    const now = new Date().toISOString();

    const crypto = await import("crypto");
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.default.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `BC-${timestamp}-${random}`;

    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: null,

        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,

        // Shipping address is unavailable — filled with empty strings so
        // NOT NULL constraints are satisfied; admin must follow up.
        shipping_name: customerName,
        shipping_phone: customerPhone || "",
        shipping_email: customerEmail,
        shipping_address_line1: "[Pending — webhook recovery]",
        shipping_address_line2: null,
        shipping_city: "",
        shipping_state: "",
        shipping_postal_code: "",
        shipping_country: "IN",

        billing_same_as_shipping: true,

        currency: payment.currency ?? "INR",
        subtotal: grandTotal,
        discount: 0,
        shipping_fee: 0,
        tax: 0,
        grand_total: grandTotal,

        payment_provider: "razorpay",
        // Distinguishes webhook-recovered orders from browser-submitted ones.
        payment_method: "razorpay-webhook-recovery",
        payment_reference: payment.id,
        razorpay_order_id: payment.order_id ?? null,
        razorpay_payment_id: payment.id,
        payment_status: "paid",

        order_status: "placed",

        payment_verified_at: now,
        paid_at: now,
      })
      .select("id, order_number, customer_name, customer_email, grand_total, shipping_fee, subtotal, discount")
      .single();

    if (insertError) {
      // 23505 = unique_violation: a concurrent webhook delivery already
      // inserted this order.  Treat as success.
      if (insertError.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("orders")
          .select("id")
          .eq("razorpay_payment_id", payment.id)
          .maybeSingle();
        return { recovered: true, orderId: raceWinner?.id };
      }

      return { recovered: false, error: insertError.message };
    }

    if (!order) {
      return { recovered: false, error: "Insert returned no data." };
    }

    console.warn(
      `[webhook-recovery] Created order ${order.id} (${orderNumber}) for payment ${
        payment.id
      }. Shipping address is MISSING — admin must contact ${customerEmail} to confirm delivery details. Stock was NOT decremented — manual review required.`
    );

    return { recovered: true, orderId: order.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { recovered: false, error: message };
  }
}
