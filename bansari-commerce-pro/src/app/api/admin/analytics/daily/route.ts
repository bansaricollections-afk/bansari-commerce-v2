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
    .select('created_at, total_amount, status')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('status', 'in', '(cancelled,failed)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/admin/analytics/daily]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by date
  const byDate = new Map<string, number>();
  for (const order of data ?? []) {
    const date = (order.created_at as string).slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + Number(order.total_amount ?? 0));
  }

  const result = Array.from(byDate.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  return NextResponse.json(result);
}
