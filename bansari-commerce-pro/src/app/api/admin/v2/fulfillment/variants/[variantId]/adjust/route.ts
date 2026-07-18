/**
 * POST /api/admin/v2/fulfillment/variants/[variantId]/adjust
 *
 * Manual stock adjustment for a variant.
 * Body: { quantity: number, movementType: string, reason: string }
 */
import { NextRequest } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRequestId } from '@/lib/request-id';
import type { InventoryMovementType } from '@/types/inventory-transaction';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const requestId = getRequestId(req);
  try {
    const { variantId } = await params;
    const body = await req.json() as {
      quantity: number;
      movementType: InventoryMovementType;
      reason: string;
      actorId?: string;
      actorName?: string;
    };

    if (typeof body.quantity !== 'number' || body.quantity === 0) {
      return apiError(requestId, 'VALIDATION', 'quantity must be a non-zero number', 400);
    }
    if (!body.reason?.trim()) {
      return apiError(requestId, 'VALIDATION', 'reason is required', 400);
    }

    await FulfillmentService.manualAdjustment({
      variantId,
      quantity:     body.quantity,
      movementType: body.movementType ?? 'manual_adjustment',
      reason:       body.reason,
      actorId:      body.actorId   ?? null,
      actorName:    body.actorName ?? null,
    });

    return apiSuccess({ adjusted: true, variantId });
  } catch (err) {
    return apiError(requestId, 'INTERNAL', (err as Error).message, 500);
  }
}
