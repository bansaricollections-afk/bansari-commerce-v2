import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed review invitations.
 *
 * WHY A TOKEN AND NOT A LOGIN
 * Checkout is a guest flow — Manas, the first real customer, never made an
 * account. Requiring a login to review would mean almost no reviews, which is
 * the same outcome as having no review system.
 *
 * The token carries the order line it was issued for and is signed, so it
 * proves exactly what a login would prove and slightly more: not just "this
 * person" but "this person bought THIS item in THIS order". It is emailed to
 * the address on the order, so possession of the link is possession of the
 * inbox that placed the order.
 *
 * WHAT THE TOKEN IS NOT
 * It is not a session and grants nothing beyond writing one review for one
 * order line. The server re-checks the order, the line, the delivered status
 * and the one-review-per-line rule on every submission; the token only
 * establishes which line is being claimed. A leaked token lets someone review
 * one kurta, not read an order or see a customer.
 */

const VERSION = 'v1';
/** A review invitation is useful for a while, but not forever. */
const DEFAULT_TTL_DAYS = 90;

export type ReviewTokenPayload = {
  orderItemId: string;
  orderId: number;
  productId: number;
  /** Unix seconds. */
  exp: number;
};

/**
 * The signing key.
 *
 * Derived from the service-role key rather than being it: a one-way HMAC with
 * a fixed label, so the signing secret and the database credential are
 * different values and the credential cannot be recovered from a token. That
 * avoids adding an env var nobody would remember to set in Vercel — at the
 * cost that rotating the service key invalidates outstanding invitations,
 * which is acceptable for a link with a 90-day life.
 *
 * REVIEW_TOKEN_SECRET overrides it when set, so the two can be separated later
 * without changing any calling code.
 */
function signingKey(): Buffer {
  const explicit = process.env.REVIEW_TOKEN_SECRET;
  if (explicit) return Buffer.from(explicit, 'utf8');

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Cannot sign review tokens: no REVIEW_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createHmac('sha256', serviceKey).update('bansari.review-token.v1').digest();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(body: string): string {
  return createHmac('sha256', signingKey()).update(body).digest('base64url');
}

/** Build the token that goes in the review link. */
export function createReviewToken(
  payload: Omit<ReviewTokenPayload, 'exp'>,
  ttlDays: number = DEFAULT_TTL_DAYS
): string {
  const full: ReviewTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 86_400,
  };
  const body = b64url(JSON.stringify(full));
  return `${VERSION}.${body}.${sign(body)}`;
}

export type ReviewTokenResult =
  | { valid: true; payload: ReviewTokenPayload }
  | { valid: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' };

/**
 * Verify and decode. Returns a reason rather than throwing, because each case
 * deserves different wording to the customer: an expired invitation is not the
 * same as a tampered one.
 */
export function verifyReviewToken(token: string, now = Date.now()): ReviewTokenResult {
  if (typeof token !== 'string') return { valid: false, reason: 'MALFORMED' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return { valid: false, reason: 'MALFORMED' };

  const [, body, signature] = parts as [string, string, string];

  /*
   * timingSafeEqual throws on a length mismatch, so compare lengths first.
   * Both sides are base64url of a SHA-256 digest, so a differing length is
   * already a failed signature.
   */
  const expected = sign(body);
  if (expected.length !== signature.length) return { valid: false, reason: 'BAD_SIGNATURE' };
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  let payload: ReviewTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ReviewTokenPayload;
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }

  if (
    typeof payload?.orderItemId !== 'string' ||
    typeof payload?.orderId !== 'number' ||
    typeof payload?.productId !== 'number' ||
    typeof payload?.exp !== 'number'
  ) {
    return { valid: false, reason: 'MALFORMED' };
  }

  // Signature is checked BEFORE expiry, so an attacker cannot learn anything
  // by forging a payload with a distant exp.
  if (payload.exp * 1000 < now) return { valid: false, reason: 'EXPIRED' };

  return { valid: true, payload };
}
