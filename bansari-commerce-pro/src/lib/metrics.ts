/**
 * Production Metrics Service
 *
 * Reusable, server-side only. All queries use the service-role client.
 * Call from API routes or server components — never from client bundles.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';

export type ProductMetrics = {
  conversionRate: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
  paymentSuccessRate: number;
  paymentFailureRate: number;
  averageOrderValue: number;
  ordersToday: number;
  ordersThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  lowStockCount: number;
  inventoryAlerts: Array<{ id: number; name: string; stock: number }>;
  topProducts: Array<{ productName: string; totalQty: number; totalRevenue: number }>;
  periodDays: number;
};

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function getProductionMetrics(): Promise<ProductMetrics> {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayISO = startOfDay(now).toISOString();
  const monthISO = startOfMonth(now).toISOString();

  const LOW_STOCK_THRESHOLD = 5;

  const [
    todayOrders,
    monthOrders,
    allPaidOrders,
    pendingOrders,
    lowStock,
    topProducts,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('grand_total, payment_status, order_status')
      .gte('created_at', todayISO),

    supabase
      .from('orders')
      .select('grand_total, payment_status, order_status')
      .gte('created_at', monthISO),

    supabase
      .from('orders')
      .select('grand_total, payment_status')
      .in('payment_status', ['paid', 'failed']),

    supabase
      .from('pending_orders')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('products')
      .select('id, name, stock')
      .lte('stock', LOW_STOCK_THRESHOLD)
      .eq('active', true)
      .order('stock', { ascending: true })
      .limit(20),

    supabase
      .from('order_items')
      .select('product_name, quantity, line_total')
      .limit(1000),
  ]);

  const todayData = todayOrders.data ?? [];
  const monthData = monthOrders.data ?? [];
  const allPaid = allPaidOrders.data ?? [];

  const revenueToday = todayData
    .filter((o) => o.payment_status === 'paid')
    .reduce((s, o) => s + Number(o.grand_total ?? 0), 0);

  const revenueThisMonth = monthData
    .filter((o) => o.payment_status === 'paid')
    .reduce((s, o) => s + Number(o.grand_total ?? 0), 0);

  const ordersToday = todayData.filter((o) => o.payment_status === 'paid').length;
  const ordersThisMonth = monthData.filter((o) => o.payment_status === 'paid').length;

  const totalWithOutcome = allPaid.length;
  const totalPaid = allPaid.filter((o) => o.payment_status === 'paid').length;
  const totalFailed = allPaid.filter((o) => o.payment_status === 'failed').length;
  const paymentSuccessRate = totalWithOutcome > 0 ? (totalPaid / totalWithOutcome) * 100 : 0;
  const paymentFailureRate = totalWithOutcome > 0 ? (totalFailed / totalWithOutcome) * 100 : 0;

  const pendingCount = pendingOrders.count ?? 0;
  const totalCheckouts = totalWithOutcome + pendingCount;
  const cartAbandonmentRate = totalCheckouts > 0 ? (pendingCount / totalCheckouts) * 100 : 0;
  const checkoutAbandonmentRate = totalCheckouts > 0 ? (totalFailed / totalCheckouts) * 100 : 0;
  const conversionRate = totalCheckouts > 0 ? (totalPaid / totalCheckouts) * 100 : 0;

  const averageOrderValue = ordersThisMonth > 0 ? revenueThisMonth / ordersThisMonth : 0;

  const topProductMap = new Map<string, { totalQty: number; totalRevenue: number }>();
  for (const item of topProducts.data ?? []) {
    const key = item.product_name;
    const prev = topProductMap.get(key) ?? { totalQty: 0, totalRevenue: 0 };
    topProductMap.set(key, {
      totalQty: prev.totalQty + (item.quantity ?? 0),
      totalRevenue: prev.totalRevenue + Number(item.line_total ?? 0),
    });
  }
  const topProductsList = Array.from(topProductMap.entries())
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 10);

  return {
    conversionRate: Math.round(conversionRate * 10) / 10,
    cartAbandonmentRate: Math.round(cartAbandonmentRate * 10) / 10,
    checkoutAbandonmentRate: Math.round(checkoutAbandonmentRate * 10) / 10,
    paymentSuccessRate: Math.round(paymentSuccessRate * 10) / 10,
    paymentFailureRate: Math.round(paymentFailureRate * 10) / 10,
    averageOrderValue: Math.round(averageOrderValue),
    ordersToday,
    ordersThisMonth,
    revenueToday: Math.round(revenueToday),
    revenueThisMonth: Math.round(revenueThisMonth),
    lowStockCount: lowStock.data?.length ?? 0,
    inventoryAlerts: (lowStock.data ?? []).map((p) => ({
      id: p.id as number,
      name: p.name as string,
      stock: p.stock as number,
    })),
    topProducts: topProductsList,
    periodDays: 30,
  };
}
