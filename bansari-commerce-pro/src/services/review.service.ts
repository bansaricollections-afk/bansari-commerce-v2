import { cache } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'reviews' });

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** A review as the storefront sees it. Deliberately excludes customer_email. */
export type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ProductRatingSummary = {
  average: number;
  count: number;
  /** Rating → how many reviews gave it. Missing keys mean zero. */
  distribution: Record<number, number>;
};

/** What the review form needs to show before anyone types anything. */
export type ReviewInvitation = {
  orderItemId: string;
  orderId: number;
  orderNumber: string;
  productId: number;
  productName: string;
  productImage: string | null;
  variantSize: string | null;
  customerEmail: string;
  suggestedName: string;
};

export type InvitationResult =
  | { ok: true; invitation: ReviewInvitation }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_DELIVERED' | 'ALREADY_REVIEWED'; message: string };

/**
 * Resolve a token payload into something reviewable — and refuse if it is not.
 *
 * EVERY RULE IS CHECKED HERE, NOT IN THE TOKEN.
 * The token says which order line is being claimed. It does not say the line
 * exists, that it belongs to that order, that the order was delivered, or that
 * it has not already been reviewed — all of which can change after the link is
 * sent. A token issued at dispatch must not still work if the order is later
 * cancelled, so the state is re-read on every use.
 */
export async function getReviewInvitation(
  orderItemId: string,
  orderId: number
): Promise<InvitationResult> {
  const sb = createServiceRoleClient();

  const { data: item, error: itemError } = await sb
    .from('order_items')
    .select('id, order_id, product_id, product_name, product_image, variant_size')
    .eq('id', orderItemId)
    .maybeSingle();

  if (itemError) {
    log.error('reviews.invitation.item_lookup_failed', itemError);
    return { ok: false, code: 'NOT_FOUND', message: 'We could not find that purchase.' };
  }

  // The order id is in the signed payload AND on the row; they must agree, or
  // the token is describing a line it was not issued for.
  if (!item || Number(item.order_id) !== Number(orderId)) {
    return { ok: false, code: 'NOT_FOUND', message: 'We could not find that purchase.' };
  }

  const { data: order, error: orderError } = await sb
    .from('orders')
    .select('id, order_number, order_v2_status, customer_email, customer_name')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, code: 'NOT_FOUND', message: 'We could not find that order.' };
  }

  /*
   * Delivered only. Reviewing something that has not arrived is not a review
   * of the garment, and an order can still be cancelled or returned after the
   * invitation goes out.
   */
  if (order.order_v2_status !== 'delivered') {
    return {
      ok: false,
      code: 'NOT_DELIVERED',
      message: 'This order has not been delivered yet. We will email you once it arrives.',
    };
  }

  const { data: existing } = await sb
    .from('reviews')
    .select('id')
    .eq('order_item_id', orderItemId)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      code: 'ALREADY_REVIEWED',
      message: 'You have already reviewed this piece — thank you.',
    };
  }

  return {
    ok: true,
    invitation: {
      orderItemId: item.id as string,
      orderId: Number(order.id),
      orderNumber: order.order_number as string,
      productId: Number(item.product_id),
      productName: (item.product_name as string) ?? 'your purchase',
      productImage: (item.product_image as string) ?? null,
      variantSize: (item.variant_size as string) ?? null,
      customerEmail: order.customer_email as string,
      // Pre-fill, not a constraint — the customer may publish under any name.
      suggestedName: (order.customer_name as string) ?? '',
    },
  };
}

export type SubmitResult =
  | { ok: true; reviewId: string }
  | { ok: false; code: string; message: string };

/**
 * Store a review as `pending`.
 *
 * Re-resolves the invitation first rather than trusting anything the form
 * sent: the product id, the email and the verified flag are all taken from
 * the order, never from the request body. The only things the customer
 * controls are their display name, the rating and the words.
 */
export async function submitReview(input: {
  orderItemId: string;
  orderId: number;
  rating: number;
  authorName: string;
  title?: string | null;
  body?: string | null;
}): Promise<SubmitResult> {
  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, code: 'RATING_INVALID', message: 'Please choose a rating from 1 to 5 stars.' };
  }

  const authorName = (input.authorName ?? '').trim().slice(0, 80);
  if (authorName.length < 2) {
    return { ok: false, code: 'NAME_REQUIRED', message: 'Please tell us what name to publish this under.' };
  }

  const invitation = await getReviewInvitation(input.orderItemId, input.orderId);
  if (!invitation.ok) {
    return { ok: false, code: invitation.code, message: invitation.message };
  }

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('reviews')
    .insert({
      product_id:     invitation.invitation.productId,
      product_name:   invitation.invitation.productName,
      order_id:       invitation.invitation.orderId,
      order_item_id:  invitation.invitation.orderItemId,
      customer_email: invitation.invitation.customerEmail,
      author_name:    authorName,
      rating,
      title: (input.title ?? '').trim().slice(0, 120) || null,
      body:  (input.body ?? '').trim().slice(0, 4000) || null,
      verified_purchase: true,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = the unique constraint on order_item_id. Two tabs, one purchase.
    if ((error as { code?: string }).code === '23505') {
      return { ok: false, code: 'ALREADY_REVIEWED', message: 'You have already reviewed this piece — thank you.' };
    }
    log.error('reviews.submit.failed', error);
    return { ok: false, code: 'INTERNAL', message: 'We could not save your review. Please try again.' };
  }

  log.info('reviews.submitted', { reviewId: data.id, productId: invitation.invitation.productId, rating });
  return { ok: true, reviewId: data.id as string };
}

/**
 * Approved reviews for one product, newest first.
 *
 * customer_email is never selected. It is not "filtered out later" — it does
 * not leave the database, so it cannot reach a serialised RSC payload by
 * accident.
 */
export const getProductReviews = cache(async function getProductReviews(
  productId: number
): Promise<PublicReview[]> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('reviews')
      .select('id, author_name, rating, title, body, verified_purchase, created_at')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id as string,
      authorName: r.author_name as string,
      rating: Number(r.rating),
      title: (r.title as string) ?? null,
      body: (r.body as string) ?? null,
      verifiedPurchase: Boolean(r.verified_purchase),
      createdAt: r.created_at as string,
    }));
  } catch {
    // A review section is never worth failing a product page over.
    return [];
  }
});

/**
 * Rating summary for a product, from approved reviews only.
 *
 * Returns count 0 when there are none — and callers must then emit NO
 * aggregateRating at all. An invented or zero rating in structured data is a
 * Google structured-data violation and risks a manual action, which is why
 * the storefront withheld the seeded placeholder ratings in the first place.
 */
export const getProductRatingSummary = cache(async function getProductRatingSummary(
  productId: number
): Promise<ProductRatingSummary> {
  const empty: ProductRatingSummary = { average: 0, count: 0, distribution: {} };

  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('status', 'approved');

    if (error || !data || data.length === 0) return empty;

    const distribution: Record<number, number> = {};
    let total = 0;
    for (const row of data) {
      const r = Number(row.rating);
      total += r;
      distribution[r] = (distribution[r] ?? 0) + 1;
    }

    return {
      average: Math.round((total / data.length) * 10) / 10,
      count: data.length,
      distribution,
    };
  } catch {
    return empty;
  }
});
