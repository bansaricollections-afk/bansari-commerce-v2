/**
 * meta-capi.ts
 * ------------
 * Meta Conversions API — the server-side twin of the browser Meta Pixel.
 *
 * WHY THIS EXISTS
 *
 * The pixel fires Purchase from a payment callback in the browser
 * (CashfreeButton / RazorpayButton). That event is lost whenever the browser
 * is: blocking third-party scripts, on iOS with ATT denied, closed before the
 * callback runs, or — the common Cashfree case — returned to the site by a
 * redirect rather than the JS callback. In India on mobile that is routinely
 * 20–35% of real conversions. Meta then optimises delivery toward a biased
 * sample of buyers, which is worse than reporting inaccuracy: it misspends
 * budget.
 *
 * A server-side event has none of those failure modes. It is sent from the
 * same code path that decides the order is real, so it fires exactly when a
 * payment is genuinely confirmed.
 *
 * DEDUPLICATION
 *
 * Browser and server both report the same Purchase. Meta collapses them when
 * `event_name` AND `event_id` match. The browser already sends the payment
 * provider's order id as `eventID` (this was wired up ahead of time in
 * CashfreeButton / RazorpayButton), so this module must use that same id and
 * nothing else. Get it wrong and every conversion is counted twice.
 *
 * PII
 *
 * Meta matches users on hashed identifiers. Email and phone are SHA-256 hashed
 * HERE, server-side, after normalisation — the raw values never leave this
 * process and were never available to the browser pixel in the first place.
 * Normalisation must exactly match Meta's spec or the hash matches nothing:
 * lowercase, trim, strip formatting, and for phone numbers include the country
 * code with no `+`.
 *
 * FAILURE POLICY
 *
 * Never throws, never blocks. The customer has already paid and the order is
 * already committed by the time this runs. A Meta outage must not turn a
 * successful payment into an error, so every failure is logged and swallowed.
 */
import crypto from 'crypto';

import { createLogger } from '@/lib/logger';
import type { Attribution } from '@/lib/attribution';

/**
 * Pinned Graph API version. Meta deprecates versions on a ~2 year cycle and an
 * unpinned URL would change behaviour under us without a deploy.
 */
const GRAPH_VERSION = 'v21.0';

/** Requests are aborted rather than holding a serverless function open. */
const TIMEOUT_MS = 3000;

/**
 * The pixel id is the same one the browser uses — NEXT_PUBLIC_ by necessity,
 * since it ships in the page. The access token is server-only and grants the
 * ability to write conversions to that pixel, so it must never gain a
 * NEXT_PUBLIC_ prefix.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
/** Set only while validating in Events Manager → Test Events. Unset in prod. */
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

const log = createLogger({ service: 'meta.capi' });

export type MetaLineItem = {
  id: string;
  quantity: number;
  item_price: number;
};

export type MetaPurchaseInput = {
  /** MUST equal the `eventID` the browser pixel sent, or events double-count. */
  eventId: string;
  value: number;
  currency: string;
  contents: MetaLineItem[];
  /** Our own order number — shows in Events Manager, aids manual reconciliation. */
  orderNumber?: string;
  customer: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    /** Supabase user id, hashed as external_id. Null for guest checkouts. */
    userId?: string | null;
  };
  attribution?: Attribution;
  /** Unix SECONDS. Defaults to now. Meta rejects events older than 7 days. */
  eventTime?: number;
  requestId?: string;
};

/**
 * Meta wants first and last name as separate hashed fields, but checkout
 * collects one free-text name. The first token is the given name and
 * everything after it the family name — the standard split, and wrong only for
 * mononyms, where the last name is omitted rather than duplicated.
 *
 * Lives here rather than in either payment path so both providers hash names
 * identically; a divergence would silently halve match quality on one of them.
 */
export function splitName(
  fullName: string | null | undefined
): { first: string | null; last: string | null } {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Meta's normalisation for free-text fields: trim, lowercase, then hash. */
function hashText(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  return normalised.length > 0 ? sha256(normalised) : undefined;
}

function hashEmail(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  // A value with no '@' is not an email; hashing it just poisons match rate.
  if (!normalised.includes('@')) return undefined;
  return sha256(normalised);
}

/**
 * Meta requires phone numbers as digits only, INCLUDING the country code and
 * excluding '+'. This store validates Indian 10-digit mobiles at checkout, so
 * a bare 10-digit value is prefixed with 91. Anything already carrying a
 * country code (11–15 digits) is passed through unchanged.
 */
function hashPhone(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return undefined;
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  if (withCountryCode.length < 11 || withCountryCode.length > 15) return undefined;
  return sha256(withCountryCode);
}

/** Postal codes: digits/letters only, lowercased. Indian PINs are 6 digits. */
function hashPostalCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return normalised.length > 0 ? sha256(normalised) : undefined;
}

/** Meta expects a lowercase two-letter ISO country code, hashed. */
function hashCountry(value: string | null | undefined): string | undefined {
  const normalised = (value ?? 'IN').trim().toLowerCase();
  if (normalised.length !== 2) return undefined;
  return sha256(normalised);
}

/** Drop undefined keys — Meta rejects nulls in user_data. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

/**
 * Report a confirmed Purchase to Meta.
 *
 * Resolves to `true` only when Meta accepted the event. Callers use that to
 * decide whether to mark the order as reported; a `false` leaves the marker
 * unset so a later webhook retry can try again, which is the correct trade —
 * duplicate delivery is deduplicated by `event_id`, but a dropped conversion
 * is gone for good.
 */
export async function sendMetaPurchase(input: MetaPurchaseInput): Promise<boolean> {
  if (!isMetaCapiConfigured()) return false;

  const rLog = log.child({ requestId: input.requestId ?? 'n/a' });
  const attribution = input.attribution ?? {};

  const userData = compact({
    em: hashEmail(input.customer.email),
    ph: hashPhone(input.customer.phone),
    fn: hashText(input.customer.firstName),
    ln: hashText(input.customer.lastName),
    ct: hashText(input.customer.city),
    st: hashText(input.customer.state),
    zp: hashPostalCode(input.customer.postalCode),
    country: hashCountry(input.customer.country),
    external_id: input.customer.userId ? sha256(input.customer.userId) : undefined,
    // fbc/fbp are already opaque Meta identifiers and must NOT be hashed.
    fbc: attribution.fbc,
    fbp: attribution.fbp,
    client_ip_address: attribution.client_ip,
    client_user_agent: attribution.user_agent,
  });

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        // 'website' even when sent from a webhook: the conversion originated
        // on the site. 'system_generated' would exclude it from attribution.
        action_source: 'website',
        event_source_url: attribution.event_source_url,
        user_data: userData,
        custom_data: compact({
          currency: input.currency,
          value: input.value,
          content_type: 'product',
          content_ids: input.contents.map((c) => c.id),
          contents: input.contents,
          num_items: input.contents.reduce((n, c) => n + c.quantity, 0),
          order_id: input.orderNumber,
        }),
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN!)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      // Body is read for the diagnostic only. It contains no customer PII —
      // everything identifying in the request was hashed before it was sent.
      const body = await response.text().catch(() => '');
      rLog.error('meta.capi.rejected', {
        status: response.status,
        eventId: input.eventId,
        body: body.slice(0, 500),
      });
      return false;
    }

    rLog.info('meta.capi.sent', {
      eventId: input.eventId,
      value: input.value,
      matchKeys: Object.keys(userData).length,
    });
    return true;
  } catch (err) {
    rLog.error('meta.capi.failed', {
      eventId: input.eventId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
