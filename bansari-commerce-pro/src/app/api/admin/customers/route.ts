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

  /*
   * Field names are snake_case because that is the contract AdminCustomers
   * declares in its CustomerSummary type and uses for its sort keys. This
   * route previously emitted orderCount / totalSpent / lastOrderAt, so every
   * one of those columns rendered blank and sorting compared undefined.
   */
  type CustomerSummary = {
    user_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    order_count: number;
    total_spent: number;
    last_order_at: string;
  };

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        'user_id, customer_name, customer_email, customer_phone, created_at, grand_total, order_status'
      )
      .order('created_at', { ascending: false });

    if (error) {
      log.error('admin.customers.get.failed', error);
      return apiError(requestId, 'DB_ERROR', error.message, 500);
    }

    const customerMap = new Map<string, CustomerSummary>();

    for (const row of data ?? []) {
      /*
       * Grouped by EMAIL first, falling back to user_id. Grouping by user_id
       * first split one person into two rows when they ordered once signed in
       * and once as a guest — and worse, the table keys its rows on email, so
       * two user_id-keyed entries sharing an address collided into duplicate
       * React keys.
       */
      const email = ((row.customer_email as string) ?? '').trim().toLowerCase();
      const key = email || (row.user_id as string) || 'unknown';

      const createdAt = row.created_at as string;

      const existing = customerMap.get(key);
      if (!existing) {
        customerMap.set(key, {
          user_id: (row.user_id as string) ?? null,
          name: (row.customer_name as string) ?? 'Unknown',
          email: (row.customer_email as string) ?? '',
          phone: (row.customer_phone as string) || null,
          order_count: 1,
          total_spent: Number(row.grand_total ?? 0),
          last_order_at: createdAt,
        });
        continue;
      }

      existing.order_count += 1;
      existing.total_spent += Number(row.grand_total ?? 0);
      if (createdAt > existing.last_order_at) existing.last_order_at = createdAt;
    }

    return NextResponse.json({
      success: true,
      requestId,
      data: Array.from(customerMap.values()),
    });
  } catch (err) {
    /*
     * Without this the route had no catch at all, so anything thrown outside
     * the Supabase error branch surfaced as a bare framework 500 with no
     * requestId and nothing in the logs to correlate against.
     */
    log.error('admin.customers.get.unhandled', err);
    const message = err instanceof Error ? err.message : 'Failed to load customers.';
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
