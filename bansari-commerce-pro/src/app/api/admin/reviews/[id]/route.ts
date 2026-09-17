/**
 * PATCH /api/admin/reviews/[id]  { status, note? }
 *
 * Approve or reject. Approving is what makes a review public and what makes it
 * count toward the product's aggregateRating, so it is recorded in the admin
 * audit log alongside the money-path actions.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { recordAdminAction } from '@/lib/audit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'admin.reviews' });

const ALLOWED = new Set(['pending', 'approved', 'rejected']);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let payload: { status?: unknown; note?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown; note?: unknown };
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const status = String(payload.status ?? '');
  if (!ALLOWED.has(status)) {
    return apiError(requestId, 'STATUS_INVALID', 'Status must be pending, approved or rejected.', 400);
  }

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('reviews')
    .update({
      status,
      moderated_at: new Date().toISOString(),
      moderated_by: auth.userId,
      moderation_note: typeof payload.note === 'string' ? payload.note.slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, product_id, status, rating')
    .single();

  if (error) {
    log.error('admin.reviews.moderate_failed', error, { requestId, id });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  await recordAdminAction({
    action: `review_${status}`,
    entityType: 'review',
    entityId: id,
    userId: auth.userId,
    metadata: { actorEmail: auth.email, requestId, productId: data.product_id, rating: data.rating },
  });

  return apiSuccess({ review: data });
}
