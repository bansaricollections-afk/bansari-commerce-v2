/**
 * GET /api/admin/v2/fulfillment/inventory/[orderId]
 *
 * Returns all inventory transactions for a given order.
 */
import { NextRequest } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { orderId } = await params;
    const transactions = await FulfillmentService.getTransactionsForOrder(orderId);
    return apiSuccess({ transactions });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
