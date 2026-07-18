/**
 * GET /api/admin/v2/fulfillment/metrics
 *
 * Returns live fulfillment dashboard metrics.
 * No business logic here — delegates entirely to FulfillmentService.
 */
import { NextRequest } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRequestId } from '@/lib/request-id';

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const metrics = await FulfillmentService.getMetrics();
    return apiSuccess({ metrics });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
