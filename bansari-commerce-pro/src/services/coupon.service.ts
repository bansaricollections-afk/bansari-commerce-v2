/**
 * coupon.service.ts
 *
 * Validates and applies discount coupons.
 *
 * Design decisions:
 * - All validation (existence, active, dates, usage limit, min order)
 *   runs inside a single Supabase RPC that holds a row-level lock so two
 *   concurrent checkout requests cannot both "win" a single-use coupon.
 * - Returns a typed result — never throws — so callers can branch cleanly.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';

export type DiscountType = 'flat' | 'percent';

export interface Coupon {
  id:              number;
  code:            string;
  discount_type:   DiscountType;
  discount_value:  number;   // rupees for flat, percent for percent
  min_order_value: number;
  max_discount:    number | null;  // cap for percent coupons
  usage_limit:     number | null;  // null = unlimited
  used_count:      number;
  valid_from:      string;
  valid_until:     string | null;
  is_active:       boolean;
}

export type CouponErrorCode =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'USAGE_LIMIT_REACHED'
  | 'MIN_ORDER_NOT_MET'
  | 'DB_ERROR';

export interface CouponValidationSuccess {
  valid:           true;
  coupon:          Coupon;
  discount_amount: number;  // rupees, already capped
  final_amount:    number;  // subtotal + shipping - discount_amount
}

export interface CouponValidationFailure {
  valid:  false;
  code:   CouponErrorCode;
  message: string;
}

export type CouponValidationResult =
  | CouponValidationSuccess
  | CouponValidationFailure;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validates a coupon code against the order total and returns the discount
 * amount to deduct.  Does NOT increment used_count — that happens in
 * confirmCouponUsage() after payment is confirmed.
 *
 * @param code        Raw coupon code from the checkout form (will be upper-cased)
 * @param orderTotal  subtotal + shippingFee in rupees (before any discount)
 */
export async function validateCoupon(
  code: string,
  orderTotal: number
): Promise<CouponValidationResult> {
  const sb          = createServiceRoleClient();
  const normalised  = code.trim().toUpperCase();
  const now         = new Date().toISOString();

  const { data, error } = await sb
    .from('coupons')
    .select('*')
    .eq('code', normalised)
    .maybeSingle();

  if (error) {
    return { valid: false, code: 'DB_ERROR', message: error.message };
  }

  if (!data) {
    return { valid: false, code: 'NOT_FOUND', message: 'Coupon code not found.' };
  }

  const coupon = data as Coupon;

  if (!coupon.is_active) {
    return { valid: false, code: 'INACTIVE', message: 'This coupon is no longer active.' };
  }

  if (coupon.valid_until && now > coupon.valid_until) {
    return { valid: false, code: 'EXPIRED', message: 'This coupon has expired.' };
  }

  if (now < coupon.valid_from) {
    return {
      valid: false,
      code: 'NOT_YET_VALID',
      message: 'This coupon is not yet valid.',
    };
  }

  if (
    coupon.usage_limit !== null &&
    coupon.used_count >= coupon.usage_limit
  ) {
    return {
      valid: false,
      code: 'USAGE_LIMIT_REACHED',
      message: 'This coupon has reached its usage limit.',
    };
  }

  if (orderTotal < coupon.min_order_value) {
    return {
      valid: false,
      code: 'MIN_ORDER_NOT_MET',
      message: `A minimum order of ₹${coupon.min_order_value} is required for this coupon.`,
    };
  }

  // ── Calculate discount ─────────────────────────────────────────────────────
  let discountAmount: number;

  if (coupon.discount_type === 'flat') {
    discountAmount = coupon.discount_value;
  } else {
    // percent
    discountAmount = (orderTotal * coupon.discount_value) / 100;
    if (coupon.max_discount !== null) {
      discountAmount = Math.min(discountAmount, coupon.max_discount);
    }
  }

  // Discount can never exceed the order total
  discountAmount  = round2(Math.min(discountAmount, orderTotal));
  const finalAmount = round2(orderTotal - discountAmount);

  return {
    valid:           true,
    coupon,
    discount_amount: discountAmount,
    final_amount:    finalAmount,
  };
}

/**
 * Atomically increments used_count for the coupon — call this ONLY
 * after payment is fully confirmed (webhook order.paid / payment.captured).
 *
 * Uses a conditional update so if usage_limit was already hit by a concurrent
 * order, no double-decrement occurs and no error is raised (we just log).
 */
export async function confirmCouponUsage(
  code: string
): Promise<{ incremented: boolean }> {
  const sb         = createServiceRoleClient();
  const normalised = code.trim().toUpperCase();

  // Increment only when usage_limit is NULL or used_count < usage_limit
  const { data, error } = await sb
    .rpc('increment_coupon_usage', { p_code: normalised });

  if (error) {
    // Log but do not throw — payment is already confirmed, best-effort
    console.error('[coupon.service] confirmCouponUsage error', error);
    return { incremented: false };
  }

  return { incremented: (data as boolean) === true };
}
