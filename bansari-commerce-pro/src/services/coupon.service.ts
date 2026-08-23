/**
 * coupon.service.ts
 * -----------------
 * Server-side coupon validation and discount calculation.
 *
 * SERVER-ONLY. Never import into a Client Component.
 *
 * The discount is money, so it is treated exactly like prices are: the browser
 * may send a coupon CODE, never a discount AMOUNT. Every caller re-validates
 * from the database and recomputes the figure, so a tampered client cannot
 * widen its own discount. /api/coupons/validate exists purely so the cart can
 * preview a total — it is never the source of what gets charged.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'coupon.service' });

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
};

export type CouponResult =
  | { ok: true; coupon: CouponRow; discount: number }
  | { ok: false; reason: string };

/** Rounds to 2dp without floating-point drift creeping into a charged amount. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validates a code against a subtotal and returns the rupee discount.
 *
 * Rejection reasons are deliberately specific ("expired", "minimum order") —
 * unlike auth, there is nothing to enumerate here, and a vague "invalid code"
 * just generates support messages.
 */
export async function validateCoupon(
  rawCode: string,
  subtotal: number
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: 'Please enter a coupon code.' };
  if (code.length > 40) return { ok: false, reason: 'Invalid coupon code.' };

  const supabase = createServiceRoleClient();

  // Codes are stored as entered by the admin, so match case-insensitively
  // rather than forcing admins to remember a convention.
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .maybeSingle();

  if (error) {
    log.error('coupon.lookup_failed', error, { code });
    return { ok: false, reason: 'Could not check that coupon. Please try again.' };
  }

  const coupon = data as CouponRow | null;
  if (!coupon) return { ok: false, reason: 'That coupon code is not valid.' };

  if (!coupon.active) {
    return { ok: false, reason: 'That coupon is no longer available.' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'That coupon has expired.' };
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { ok: false, reason: 'That coupon has reached its usage limit.' };
  }

  const minOrder = Number(coupon.min_order ?? 0);
  if (subtotal < minOrder) {
    return {
      ok: false,
      reason: `Add ₹${round2(minOrder - subtotal).toLocaleString('en-IN')} more to use this coupon.`,
    };
  }

  const value = Number(coupon.discount_value);
  const raw =
    coupon.discount_type === 'percentage' ? (subtotal * value) / 100 : value;

  /*
   * Capped at the subtotal. A flat coupon worth more than the cart, or a
   * mis-entered 200% percentage, would otherwise produce a negative total and
   * a negative amount sent to the payment gateway. Shipping is deliberately
   * outside the discount base — discounting delivery is a separate decision.
   */
  const discount = round2(Math.min(raw, subtotal));

  return { ok: true, coupon, discount };
}

export type FeaturedCoupon = {
  code: string;
  description: string | null;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrder: number;
};

/**
 * The coupon currently worth promoting, or null when there isn't one.
 *
 * Derived live from the table rather than hardcoded anywhere, so a banner can
 * never advertise a code that has expired or hit its usage limit — a customer
 * meeting "invalid coupon" at the moment they pay is worse than never seeing an
 * offer. When a coupon lapses every banner disappears on its own; when a new one
 * is created they all update with no code change.
 *
 * Newest-first: creating a code is how a merchant signals the current campaign.
 */
export async function getFeaturedCoupon(): Promise<FeaturedCoupon | null> {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    log.warn('coupon.featured_lookup_failed', { errorMessage: error.message });
    return null;
  }

  // max_uses is filtered here rather than in SQL: PostgREST cannot compare two
  // columns, and the candidate set is tiny.
  const usable = (data as CouponRow[] | null)?.find(
    (c) => c.max_uses === null || c.uses_count < c.max_uses
  );
  if (!usable) return null;

  return {
    code: usable.code,
    description: usable.description,
    discountType: usable.discount_type,
    discountValue: Number(usable.discount_value),
    minOrder: Number(usable.min_order ?? 0),
  };
}

/**
 * Records a redemption after an order is successfully persisted.
 *
 * Best-effort by design: the customer has already paid and the order exists, so
 * a failed counter update must never surface as an error. It is logged instead.
 *
 * Uses an atomic SQL increment rather than read-modify-write, so two orders
 * redeeming the last remaining use cannot both succeed on a stale count.
 */
export async function recordCouponRedemption(
  code: string,
  ctx: { orderId: string; requestId: string }
): Promise<void> {
  if (!code) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc('increment_coupon_uses', {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    log.warn('coupon.redemption_not_recorded', {
      code,
      orderId: ctx.orderId,
      requestId: ctx.requestId,
      errorMessage: error.message,
    });
  }
}
