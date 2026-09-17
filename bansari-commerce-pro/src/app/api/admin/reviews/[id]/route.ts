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
import { issueReviewReward } from '@/services/review-reward.service';
import { sendReviewRewardEmail } from '@/services/email.service';
import { REVIEW_REWARD } from '@/lib/review-reward';
import { createServiceRoleClient as sbClient } from '@/lib/supabase/service';

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
    .select('id, product_id, status, rating, photos, customer_email, author_name, product_name, reward_coupon_code')
    .single();

  if (error) {
    log.error('admin.reviews.moderate_failed', error, { requestId, id });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  /*
   * The thank-you coupon, issued here and nowhere else.
   *
   * On APPROVAL only, and only for a review that carries a photo — never at
   * submission, which would pay for a blank review and a photo of a wall.
   * issueReviewReward is safe to call twice: the unique constraint on
   * reviews.reward_coupon_code means an approve/reject/approve cycle cannot
   * mint a second code.
   *
   * Note what is NOT consulted: the rating. A one-star photo review earns the
   * same coupon as a five-star one. Paying only for praise is against Google's
   * and Meta's review policies and the FTC's endorsement rules, and it would
   * make the whole review section worthless.
   *
   * Wrapped so it can never fail the approval: the review is already public by
   * this point, and a coupon that did not send is a thing to retry, not a
   * reason to leave the review in limbo.
   */
  let rewardCode: string | null = null;
  if (status === 'approved') {
    try {
      const reward = await issueReviewReward(id);
      if (reward.issued) {
        rewardCode = reward.code;
        if (!reward.alreadyIssued) {
          const sb2 = sbClient();
          const { data: full } = await sb2
            .from('reviews')
            .select('customer_email, author_name, product_name')
            .eq('id', id)
            .maybeSingle();

          if (full?.customer_email) {
            await sendReviewRewardEmail({
              customerName:  (full.author_name as string) ?? 'there',
              customerEmail: full.customer_email as string,
              productName:   (full.product_name as string) ?? 'your purchase',
              couponCode:    reward.code,
              percentOff:    REVIEW_REWARD.percentOff,
              validDays:     REVIEW_REWARD.validDays,
            });
          }
        }
      }
    } catch (err) {
      log.error('admin.reviews.reward_failed', {
        requestId,
        id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await recordAdminAction({
    action: `review_${status}`,
    entityType: 'review',
    entityId: id,
    userId: auth.userId,
    metadata: { actorEmail: auth.email, requestId, productId: data.product_id, rating: data.rating, rewardCode },
  });

  return apiSuccess({ review: data, rewardCode });
}
