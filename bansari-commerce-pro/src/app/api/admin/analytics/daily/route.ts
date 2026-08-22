import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('orders')
    /*
     * This route still used two column names the orders table has never had
     * here: `total_amount` (the amount is `grand_total`) and `status` (the
     * lifecycle column is `order_status`), so it returned
     * "column orders.total_amount does not exist" and 500'd the whole admin
     * analytics page. `failed` is dropped from the exclusion list because it is
     * a payment_status value, not an order_status one; both capitalisations of
     * cancelled are excluded since the constraint accepts either.
     */
    .select('created_at, grand_total, order_status')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('order_status', 'in', '(cancelled,Cancelled)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/admin/analytics/daily]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by date
  const byDate = new Map<string, number>();
  for (const order of data ?? []) {
    const date = (order.created_at as string).slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + Number(order.grand_total ?? 0));
  }

  const result = Array.from(byDate.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  return NextResponse.json(result);
}
