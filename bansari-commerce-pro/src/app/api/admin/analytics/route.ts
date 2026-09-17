import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.analytics' });

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoDate = thirtyDaysAgo.toISOString();

  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('grand_total, order_status, created_at')
      .gte('created_at', isoDate),
    supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);

  if (ordersResult.error) {
    log.error('admin.analytics.orders.failed', ordersResult.error, { requestId });
    return apiError(requestId, 'DB_ERROR', ordersResult.error.message, 500);
  }

  const orders = ordersResult.data ?? [];

  /*
   * FIELD NAMES ARE SNAKE_CASE ON PURPOSE.
   *
   * This route used to return totalRevenue / totalOrders / aov /
   * completedOrders while AdminAnalytics read total_revenue, total_orders,
   * average_order_value, delivered_orders, cancelled_orders and
   * pending_orders. Every KPI card therefore read `undefined` and the page
   * looked broken while both halves were individually "working".
   *
   * The component's shape is the fuller one — it wants the cancelled and
   * pending counts too — so the API is brought to it rather than the reverse.
   */
  const isCancelled = (status: string | null) =>
    (status ?? '').toLowerCase() === 'cancelled';

  const billable = orders.filter((o) => !isCancelled(o.order_status));

  const totalRevenue = billable.reduce(
    (sum, o) => sum + Number(o.grand_total ?? 0),
    0
  );

  const deliveredOrders = orders.filter((o) => o.order_status === 'delivered').length;
  const cancelledOrders = orders.filter((o) => isCancelled(o.order_status)).length;

  /*
   * Anything not yet delivered and not cancelled is still in flight. Derived
   * rather than matched against a list of status names, so a status added to
   * the lifecycle later cannot silently vanish from this figure.
   */
  const pendingOrders = orders.length - deliveredOrders - cancelledOrders;

  /*
   * AOV over the orders the revenue actually came from.
   *
   * It used to divide total revenue by the DELIVERED count — a different
   * population from the numerator. With five real orders and none yet marked
   * delivered, that reported an average order value of zero against ₹2,480 of
   * revenue.
   */
  const averageOrderValue = billable.length > 0 ? totalRevenue / billable.length : 0;

  return NextResponse.json({
    success: true,
    requestId,
    total_revenue: totalRevenue,
    total_orders: orders.length,
    average_order_value: Math.round(averageOrderValue),
    delivered_orders: deliveredOrders,
    cancelled_orders: cancelledOrders,
    pending_orders: pendingOrders,
    total_products: productsResult.count ?? 0,
    period_days: 30,
  });
}
