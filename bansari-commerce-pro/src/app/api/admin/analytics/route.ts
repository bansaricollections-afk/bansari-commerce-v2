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
  const totalRevenue = orders
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.grand_total ?? 0), 0);

  const completedOrders = orders.filter(
    (o) => o.order_status === 'delivered'
  ).length;

  const aov = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  return NextResponse.json({
    success: true,
    requestId,
    totalRevenue,
    totalOrders: orders.length,
    completedOrders,
    aov: Math.round(aov),
    totalProducts: productsResult.count ?? 0,
    periodDays: 30,
  });
}
