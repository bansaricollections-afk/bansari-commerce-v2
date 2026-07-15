import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'user_id, shipping_address->>name, shipping_address->>email, shipping_address->>phone, created_at, total_amount, status'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/admin/customers]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate: one record per unique user_id
  const customerMap = new Map<
    string,
    {
      user_id: string;
      name: string;
      email: string;
      phone: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
    }
  >();

  for (const row of data ?? []) {
    const key = (row.user_id as string) ?? (row as Record<string, string>).email;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        user_id: row.user_id as string,
        name: (row as Record<string, string>).name ?? 'Unknown',
        email: (row as Record<string, string>).email ?? '',
        phone: (row as Record<string, string>).phone ?? '',
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: row.created_at as string,
      });
    }
    const c = customerMap.get(key)!;
    c.orderCount += 1;
    c.totalSpent += Number(row.total_amount ?? 0);
    if ((row.created_at as string) > c.lastOrderAt) {
      c.lastOrderAt = row.created_at as string;
    }
  }

  return NextResponse.json(Array.from(customerMap.values()));
}
