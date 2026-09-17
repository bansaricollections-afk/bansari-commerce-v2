import { randomBytes } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { REVIEW_REWARD } from '@/lib/review-reward';

export { REVIEW_REWARD };

const log = createLogger({ service: 'reviews.reward' });



/**
 * Issue the thank-you coupon for an approved review that carries a photo.
 *
 * WHEN IT FIRES
 * On APPROVAL, never on submission. Issuing at submission would pay for
 * anything — a blank review and a photo of a wall would earn a code. Approval
 * is the point at which a person has confirmed the review is real.
 *
 * WHAT IT DOES NOT LOOK AT
 * The rating. A one-star review with a photo earns exactly the same coupon as
 * a five-star one. Rewarding only praise is against Google's and Meta's review
 * policies and the FTC's endorsement rules, and it produces a review section
 * nobody believes. There is deliberately no `rating` in this function.
 *
 * SAFE TO CALL TWICE
 * Returns the existing code if one was already issued. The unique constraint
 * on reviews.reward_coupon_code is the real guarantee; an approve → reject →
 * approve cycle cannot mint a second coupon.
 */
export async function issueReviewReward(reviewId: string): Promise<
  { issued: false; reason: string } | { issued: true; code: string; alreadyIssued: boolean }
> {
  const sb = createServiceRoleClient();

  const { data: review, error } = await sb
    .from('reviews')
    .select('id, status, photos, reward_coupon_code, customer_email, author_name, product_name')
    .eq('id', reviewId)
    .maybeSingle();

  if (error || !review) return { issued: false, reason: 'REVIEW_NOT_FOUND' };
  if (review.status !== 'approved') return { issued: false, reason: 'NOT_APPROVED' };

  if (review.reward_coupon_code) {
    return { issued: true, code: review.reward_coupon_code as string, alreadyIssued: true };
  }

  const photos = Array.isArray(review.photos) ? review.photos : [];
  if (photos.length === 0) return { issued: false, reason: 'NO_PHOTO' };

  /*
   * Unguessable, single-use, and visibly a thank-you rather than a generic
   * promo. 5 random bytes is ~1 in a trillion per code — enough that nobody
   * finds one by trying, while staying short enough to read off a phone.
   */
  const code = `THANKYOU-${randomBytes(5).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + REVIEW_REWARD.validDays * 86_400_000).toISOString();

  const { error: couponError } = await sb.from('coupons').insert({
    code,
    description: `Thank-you reward for a photo review (review ${reviewId})`,
    discount_type: 'percentage',
    discount_value: REVIEW_REWARD.percentOff,
    min_order: REVIEW_REWARD.minOrder,
    max_uses: 1,
    active: true,
    expires_at: expiresAt,
  });

  if (couponError) {
    log.error('reviews.reward.coupon_failed', { reviewId, message: couponError.message });
    return { issued: false, reason: 'COUPON_FAILED' };
  }

  /*
   * Record it against the review. If THIS fails the coupon exists but is
   * unlinked — so it is deactivated rather than left loose, and the reward can
   * be retried cleanly next time.
   */
  const { error: linkError } = await sb
    .from('reviews')
    .update({ reward_coupon_code: code, reward_issued_at: new Date().toISOString() })
    .eq('id', reviewId)
    .is('reward_coupon_code', null);

  if (linkError) {
    await sb.from('coupons').update({ active: false }).eq('code', code);
    log.error('reviews.reward.link_failed', { reviewId, message: linkError.message });
    return { issued: false, reason: 'LINK_FAILED' };
  }

  log.info('reviews.reward.issued', { reviewId, code });
  return { issued: true, code, alreadyIssued: false };
}
