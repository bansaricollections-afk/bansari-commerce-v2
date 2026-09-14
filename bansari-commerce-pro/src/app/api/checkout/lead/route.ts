/**
 * POST /api/checkout/lead
 *
 * Captures a contactable abandoned cart the moment the checkout contact fields
 * become valid — before the customer clicks Pay.
 *
 * WHY IT IS NOT AUTHENTICATED
 * Checkout is a guest flow; there is no session to require. That makes this a
 * public writer of PII, so everything below is defensive: rate limited per IP,
 * every field length-capped, email format enforced, and the row keyed on a
 * client-supplied session id so a form being edited upserts one row instead of
 * accumulating one per keystroke.
 *
 * WHAT IT DELIBERATELY DOES NOT TRUST
 * Prices and item data come from the browser and are stored as a snapshot for
 * the merchant to read — never for billing. Order totals are computed
 * server-side at payment time by validateCartItems, which this does not touch.
 */
import { type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger({ service: 'checkout.lead' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Caps. Generous for real data, small enough that the table cannot be a dumping ground. */
const MAX_NAME = 120;
const MAX_EMAIL = 254;      // RFC 5321
const MAX_PHONE = 20;
const MAX_ITEMS = 50;
const MAX_SESSION_ID = 100;

type IncomingItem = {
  id?: unknown;
  name?: unknown;
  size?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  price?: unknown;
};

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  const limited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const sessionId = str(body.sessionId, MAX_SESSION_ID);
  const email = str(body.email, MAX_EMAIL);

  if (!sessionId) {
    return apiError(requestId, 'SESSION_REQUIRED', 'Missing session id.', 400);
  }
  if (!email || !EMAIL_RE.test(email)) {
    // Not an error worth surfacing to the shopper — they are still typing.
    return apiError(requestId, 'EMAIL_INVALID', 'A valid email is required.', 400);
  }

  const rawItems = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
  const items = rawItems.slice(0, MAX_ITEMS).map((line) => ({
    id:        num(line.id) || null,
    name:      str(line.name, 300),
    size:      str(line.size, 20),
    variantId: num(line.variantId) || null,
    quantity:  Math.max(0, Math.min(100, Math.floor(num(line.quantity)))),
    price:     num(line.price),
  }));

  const itemCount = items.reduce((total, line) => total + line.quantity, 0);
  const subtotal = items.reduce((total, line) => total + line.price * line.quantity, 0);

  /*
   * An empty cart is not a lead. Without this, landing on /checkout with a
   * stale email in autofill would create rows with nothing to recover.
   */
  if (itemCount === 0) {
    return apiSuccess({ captured: false, reason: 'EMPTY_CART' });
  }

  try {
    const sb = createServiceRoleClient();

    const { error } = await sb
      .from('checkout_leads')
      .upsert(
        {
          session_id:     sessionId,
          customer_name:  str(body.name, MAX_NAME),
          customer_email: email,
          customer_phone: str(body.phone, MAX_PHONE),
          items,
          item_count:     itemCount,
          subtotal:       Math.round(subtotal * 100) / 100,
          currency:       'INR',
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );

    if (error) {
      log.error('checkout.lead.upsert_failed', { requestId, message: error.message });
      /*
       * Capturing a lead is a merchant convenience, never the shopper's
       * problem. Returning 200 here keeps a logging failure from surfacing as
       * an error in the middle of someone's checkout.
       */
      return apiSuccess({ captured: false, reason: 'STORE_FAILED' });
    }

    return apiSuccess({ captured: true });
  } catch (err) {
    log.error('checkout.lead.unexpected', {
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    return apiSuccess({ captured: false, reason: 'STORE_FAILED' });
  }
}
