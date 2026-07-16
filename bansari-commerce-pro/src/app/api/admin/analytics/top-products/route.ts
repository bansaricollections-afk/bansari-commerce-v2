import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, products(name)')
    .order('quantity', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[GET /api/admin/analytics/top-products]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
