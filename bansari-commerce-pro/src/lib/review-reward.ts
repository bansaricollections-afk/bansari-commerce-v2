/**
 * The review thank-you offer, in one place.
 *
 * Constants only, with no imports, because both the email templates and the
 * coupon-issuing service read them. email.service.ts is otherwise
 * dependency-free (it talks to Resend over fetch), and it must not start
 * pulling in the Supabase client just to know what percentage to write in a
 * sentence.
 *
 * The point of a single source: the email promises what the coupon actually
 * gives. A customer told "10% off" who receives a 5% code has been misled by a
 * refactor, and that is a trust problem, not a typo.
 */
export const REVIEW_REWARD = {
  percentOff: 10,
  validDays: 90,
  /** No minimum spend. A thank-you with conditions attached is not a thank-you. */
  minOrder: 0,
} as const;
