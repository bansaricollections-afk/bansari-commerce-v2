/**
 * GET /api/admin/orders
 * List and search orders with filters, pagination, sorting.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import type { OrderV2SearchFilters } from '@/types/order-v2';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  try {
    const sp = request.nextUrl.searchParams;
    const filters: OrderV2SearchFilters = {
      q:                sp.get('q')                  ?? undefined,
      orderV2Status:    (sp.get('orderV2Status')     ?? undefined) as OrderV2SearchFilters['orderV2Status'],
      paymentV2Status:  (sp.get('paymentV2Status')   ?? undefined) as OrderV2SearchFilters['paymentV2Status'],
      fulfillmentStatus:(sp.get('fulfillmentStatus') ?? undefined) as OrderV2SearchFilters['fulfillmentStatus'],
      returnStatus:     (sp.get('returnStatus')      ?? undefined) as OrderV2SearchFilters['returnStatus'],
      exchangeStatus:   (sp.get('exchangeStatus')    ?? undefined) as OrderV2SearchFilters['exchangeStatus'],
      dateFrom:         sp.get('dateFrom')           ?? undefined,
      dateTo:           sp.get('dateTo')             ?? undefined,
      minTotal:         sp.get('minTotal')  ? Number(sp.get('minTotal'))  : undefined,
      maxTotal:         sp.get('maxTotal')  ? Number(sp.get('maxTotal'))  : undefined,
      page:             sp.get('page')     ? Number(sp.get('page'))     : 0,
      pageSize:         sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      sortBy:           (sp.get('sortBy')  ?? 'created_at') as OrderV2SearchFilters['sortBy'],
      sortDir:          (sp.get('sortDir') ?? 'desc') as OrderV2SearchFilters['sortDir'],
    };

    const result = await OrderV2Service.search(filters);
    return apiSuccess({ ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
