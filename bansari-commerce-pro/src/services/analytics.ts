import { createServiceRoleClient } from "@/lib/supabase/service";

export type AnalyticsSummary = {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  delivered_orders: number;
  cancelled_orders: number;
  pending_orders: number;
};

export type DailyRevenue = {
  date: string;       // YYYY-MM-DD
  revenue: number;
  orders: number;
};

export type TopProduct = {
  product_name: string;
  product_sku: string | null;
  quantity_sold: number;
  revenue: number;
};

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select("grand_total, order_status");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const total_revenue = rows.reduce((s, r) => s + (r.grand_total ?? 0), 0);
  const total_orders = rows.length;
  const average_order_value = total_orders ? total_revenue / total_orders : 0;
  const delivered_orders = rows.filter((r) => r.order_status === "delivered").length;
  const cancelled_orders = rows.filter((r) => r.order_status === "cancelled").length;
  const pending_orders = rows.filter(
    (r) => r.order_status !== "delivered" && r.order_status !== "cancelled"
  ).length;

  return {
    total_revenue,
    total_orders,
    average_order_value,
    delivered_orders,
    cancelled_orders,
    pending_orders,
  };
}

export async function getDailyRevenue(days = 30): Promise<DailyRevenue[]> {
  const supabase = createServiceRoleClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("orders")
    .select("grand_total, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Aggregate by date client-side
  const map = new Map<string, DailyRevenue>();
  for (const row of data ?? []) {
    const date = row.created_at.slice(0, 10);
    const existing = map.get(date);
    if (existing) {
      existing.revenue += row.grand_total ?? 0;
      existing.orders += 1;
    } else {
      map.set(date, { date, revenue: row.grand_total ?? 0, orders: 1 });
    }
  }

  return Array.from(map.values());
}

export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("order_items")
    .select("product_name, product_sku, quantity, line_total");

  if (error) throw new Error(error.message);

  const map = new Map<string, TopProduct>();
  for (const row of data ?? []) {
    const key = row.product_sku ?? row.product_name;
    const existing = map.get(key);
    if (existing) {
      existing.quantity_sold += row.quantity ?? 0;
      existing.revenue += row.line_total ?? 0;
    } else {
      map.set(key, {
        product_name: row.product_name,
        product_sku: row.product_sku,
        quantity_sold: row.quantity ?? 0,
        revenue: row.line_total ?? 0,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
