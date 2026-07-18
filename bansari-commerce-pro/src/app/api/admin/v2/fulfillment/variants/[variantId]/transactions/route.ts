/**
 * GET /api/admin/v2/fulfillment/variants/[variantId]/transactions
 *
 * Returns inventory transaction audit log for a specific variant.
 * Query param: ?limit=50 (default 50, max 200)
 */
import { NextRequest } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { variantId: variantIdStr } = await params;
    const variantId = Number(variantIdStr);
    if (!Number.isFinite(variantId) || variantId <= 0) {
      return apiError(requestId, 'VALIDATION', 'variantId must be a positive integer', 400);
    }

    const rawLimit = req.nextUrl.searchParams.get('limit');
    const limit = Math.min(200, Math.max(1, parseInt(rawLimit ?? '50', 10)));
    const transactions = await FulfillmentService.getTransactionsForVariant(variantId, limit);
    return apiSuccess({ transactions });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
