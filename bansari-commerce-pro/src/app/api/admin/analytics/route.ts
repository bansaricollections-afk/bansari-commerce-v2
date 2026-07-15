import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoDate = thirtyDaysAgo.toISOString();

  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', isoDate),
    supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);

  if (ordersResult.error) {
    console.error('[GET /api/admin/analytics]', ordersResult.error);
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  const orders = ordersResult.data ?? [];
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'failed')
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  const completedOrders = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'completed'
  ).length;

  const aov = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  return NextResponse.json({
    totalRevenue,
    totalOrders: orders.length,
    completedOrders,
    aov: Math.round(aov),
    totalProducts: productsResult.count ?? 0,
    periodDays: 30,
  });
}
