import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Customer data derived from the orders table.
 * No separate `profiles` table exists yet — customers are identified
 * by email across orders. Service-role client required (same RLS reason
 * as order.service.ts).
 */
export type CustomerSummary = {
  email: string;
  name: string;
  phone: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string;
};

export async function getCustomers(): Promise<CustomerSummary[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "customer_email, customer_name, customer_phone, grand_total, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Group by email client-side (no GROUP BY support in PostgREST without a view)
  const map = new Map<string, CustomerSummary>();

  for (const row of data ?? []) {
    const existing = map.get(row.customer_email);
    if (existing) {
      existing.order_count += 1;
      existing.total_spent += row.grand_total ?? 0;
      // keep latest order date
      if (row.created_at > existing.last_order_at) {
        existing.last_order_at = row.created_at;
      }
    } else {
      map.set(row.customer_email, {
        email: row.customer_email,
        name: row.customer_name ?? "—",
        phone: row.customer_phone ?? null,
        order_count: 1,
        total_spent: row.grand_total ?? 0,
        last_order_at: row.created_at,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime()
  );
}
