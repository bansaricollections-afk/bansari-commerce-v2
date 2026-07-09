import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Order read operations for admin use.
 *
 * Uses the service-role client, not the regular server/browser client.
 * RLS on `orders`/`order_items` only allows a customer to SELECT their own
 * rows (`user_id = auth.uid()`), and orders are currently created with
 * `user_id: null` (no customer-account system exists yet) — so no
 * authenticated session, including an admin's, can read any order rows
 * under that policy alone. The service-role client bypasses RLS entirely,
 * which is the only way admin order reads can return data today.
 *
 * SERVER-SIDE USE ONLY. Never import this into a Client Component — the
 * service-role key must never reach the browser.
 */

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  grand_total: number;
  currency: string;
  payment_provider: string | null;
  payment_method: string | null;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
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

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Order | null;
}