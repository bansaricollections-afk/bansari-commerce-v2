/**
 * POST /api/admin/orders/[id]/review-reminder
 *
 * Sends one gentle follow-up asking for a review on a delivered order. All
 * the rules — delivered only, unreviewed items only, once per order — live in
 * sendReviewReminder so they hold however the function is called.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { recordAdminAction } from '@/lib/audit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { sendReviewReminder } from '@/services/order-v2.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return apiError(requestId, 'VALIDATION', 'Invalid order id', 422);
  }

  try {
    const result = await sendReviewReminder(orderId);

    if (!result.sent) {
      // A refusal is not a server error: "already reminded" and "not yet
      // delivered" are normal answers the admin should read, not crashes.
      return apiError(requestId, 'NOT_SENT', result.reason ?? 'Not sent', 409);
    }

    // Outbound email to a customer — recorded so there is a trail of who
    // asked, and when.
    await recordAdminAction({
      action: 'order_review_reminder',
      entityType: 'order',
      entityId: id,
      userId: auth.userId,
      metadata: { actorEmail: auth.email, items: result.items, requestId },
    });

    return apiSuccess({ sent: true, items: result.items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
