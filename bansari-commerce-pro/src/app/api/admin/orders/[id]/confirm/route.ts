/**
 * POST /api/admin/orders/[id]/confirm
 *
 * WHY THIS EXISTS
 * OrderV2Service.confirm() has been implemented since the V2 model landed, and
 * the Cashfree persist path deliberately leaves order_v2_status at 'pending'
 * ("the merchant advances it via the confirm transition"). But nothing ever
 * exposed that transition: there was no route and no admin button. So every
 * paid order sat at 'pending' forever, and because the order screen only shows
 * "Ship Order" from confirmed/processing/packed, there was no way to record a
 * courier and AWB — the first real order could not be dispatched.
 *
 * This is the missing first step of the lifecycle:
 *   pending → confirmed → (packed) → shipped → delivered
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { recordAdminAction } from '@/lib/audit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const order = await OrderV2Service.confirm(id, {
      actorId:   auth.userId,
      actorName: auth.email,
    });

    // Confirm moves an order into the fulfilment pipeline, so it belongs in the
    // same audit trail as ship/deliver/refund. Recorded before responding so
    // the trail exists even if the client never receives the response.
    await recordAdminAction({
      action: 'order_confirm',
      entityType: 'order',
      entityId: id,
      userId: auth.userId,
      metadata: { actorEmail: auth.email, requestId },
    });

    return apiSuccess({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      const status = err.code === 'NOT_FOUND' ? 404
        : err.code === 'INVALID_STATUS_TRANSITION' ? 422
        : 500;
      return apiError(requestId, err.code, err.message, status);
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
