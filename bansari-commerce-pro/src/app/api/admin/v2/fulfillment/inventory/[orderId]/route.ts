/**
 * GET /api/admin/v2/fulfillment/inventory/[orderId]
 *
 * Returns all inventory transactions for a given order.
 */
import { NextRequest, NextResponse } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { requireAdminSession } from '@/lib/auth/requireAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { orderId } = await params;
    const transactions = await FulfillmentService.getTransactionsForOrder(orderId);
    return apiSuccess({ transactions });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
