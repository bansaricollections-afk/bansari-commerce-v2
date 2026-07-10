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