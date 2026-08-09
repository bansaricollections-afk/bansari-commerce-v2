/**
 * GET /api/admin/v2/fulfillment/metrics
 *
 * Returns live fulfillment dashboard metrics.
 * No business logic here — delegates entirely to FulfillmentService.
 */
import { NextRequest, NextResponse } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { requireAdminSession } from '@/lib/auth/requireAdmin';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const metrics = await FulfillmentService.getMetrics();
    return apiSuccess({ metrics });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
