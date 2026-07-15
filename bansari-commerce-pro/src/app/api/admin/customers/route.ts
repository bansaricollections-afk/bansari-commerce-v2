import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.customers' });

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'user_id, customer_name, customer_email, customer_phone, created_at, grand_total, order_status'
    )
    .order('created_at', { ascending: false });

  if (error) {
    log.error('admin.customers.get.failed', error, { requestId });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

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
    const key = (row.user_id as string) ?? (row.customer_email as string);
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        user_id: row.user_id as string,
        name: (row.customer_name as string) ?? 'Unknown',
        email: (row.customer_email as string) ?? '',
        phone: (row.customer_phone as string) ?? '',
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: row.created_at as string,
      });
    }
    const c = customerMap.get(key)!;
    c.orderCount += 1;
    c.totalSpent += Number(row.grand_total ?? 0);
    if ((row.created_at as string) > c.lastOrderAt) {
      c.lastOrderAt = row.created_at as string;
    }
  }

  return NextResponse.json({ success: true, requestId, data: Array.from(customerMap.values()) });
}
