/**
 * POST /api/admin/orders/[id]/out-for-delivery
 *
 * Moves a shipped order to `out_for_delivery`, which is the only transition
 * that sends the "out for delivery" customer email.
 *
 * That email already existed in email.service, and OrderV2Service.updateStatus
 * already sent it — but no admin route or button reached updateStatus, so it
 * could never actually fire. This exposes it.
 *
 * Valid transitions (see lib/order-errors.ts): shipped -> out_for_delivery ->
 * delivered. Attempting it from any other status returns 422 rather than
 * silently doing nothing.
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
    const order = await OrderV2Service.updateStatus(id, 'out_for_delivery', {
      actorId:   auth.userId,
      actorName: auth.email,
    });

    // Money-path action — recorded before responding so the trail exists even
    // if the client never receives the response.
    await recordAdminAction({
      action: 'order_out_for_delivery',
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
