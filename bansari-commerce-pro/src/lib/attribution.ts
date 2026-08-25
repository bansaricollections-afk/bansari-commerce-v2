/**
 * attribution.ts
 * --------------
 * Server-side reader for the ad-attribution signals a request carries.
 *
 * Two independent sources, both first-party cookies on our own domain:
 *
 *   `_fbp` / `_fbc`  — written by fbevents.js (the Meta Pixel). `_fbc` only
 *                      exists when the visitor arrived on a URL carrying
 *                      `fbclid`, i.e. from a Meta ad click. These are the
 *                      match keys the Conversions API uses, and they are by
 *                      far the strongest signal available.
 *
 *   `bc_attr`        — written by our own AttributionCapture component
 *                      (src/analytics/attribution-capture.tsx). Carries UTMs
 *                      and click ids for every platform, including ones with
 *                      no pixel installed, so a channel can be attributed
 *                      before its tag exists.
 *
 * Nothing here is trusted for anything that moves money — it is reporting
 * metadata only, so hostile values cost nothing beyond a wrong dashboard row.
 * Every field is still length-capped, because these values are attacker-
 * controlled and land in a jsonb column and in an outbound API payload.
 */
import type { NextRequest } from 'next/server';

/** Longest value we will store for any single attribution field. */
const MAX_FIELD = 512;
/** Longest `bc_attr` cookie we will even attempt to parse. */
const MAX_COOKIE = 4096;

const ATTR_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'ttclid',
  'msclkid',
  'landing_path',
  'referrer',
  'first_seen',
] as const;

type AttrKey = (typeof ATTR_KEYS)[number];

export type Attribution = Partial<Record<AttrKey, string>> & {
  /** Meta browser id cookie. */
  fbp?: string;
  /** Meta click id cookie, in Meta's `fb.1.<ts>.<fbclid>` format. */
  fbc?: string;
  /** Best-effort originating IP, for Conversions API match quality. */
  client_ip?: string;
  /** Browser UA string, for Conversions API match quality. */
  user_agent?: string;
  /** The page the customer was on when the order was created. */
  event_source_url?: string;
};

function clamp(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_FIELD);
}

/**
 * Resolve the client IP.
 *
 * On Vercel `x-forwarded-for` is set by the edge and its FIRST entry is the
 * real client; later entries are proxies. `x-real-ip` is the fallback. Both
 * are spoofable in principle, but on Vercel the platform overwrites
 * x-forwarded-for, so the first hop is trustworthy in practice.
 *
 * An IPv4-mapped IPv6 prefix is stripped — Meta rejects `::ffff:1.2.3.4`.
 */
function resolveClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const raw = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim();
  if (!raw) return undefined;
  const normalised = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  return clamp(normalised);
}

/**
 * Read every attribution signal on the request.
 *
 * Never throws: a malformed or oversized `bc_attr` cookie yields an object
 * without those keys rather than failing the checkout it was read during.
 */
export function readAttribution(request: NextRequest): Attribution {
  const attribution: Attribution = {};

  const fbp = clamp(request.cookies.get('_fbp')?.value);
  const fbc = clamp(request.cookies.get('_fbc')?.value);
  if (fbp) attribution.fbp = fbp;
  if (fbc) attribution.fbc = fbc;

  const raw = request.cookies.get('bc_attr')?.value;
  if (raw && raw.length <= MAX_COOKIE) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        for (const key of ATTR_KEYS) {
          const value = clamp(record[key]);
          if (value) attribution[key] = value;
        }
      }
    } catch {
      // A tampered or truncated cookie is not an error worth surfacing — the
      // order matters, the marketing metadata does not.
    }
  }

  const ip = resolveClientIp(request);
  if (ip) attribution.client_ip = ip;

  const ua = clamp(request.headers.get('user-agent'));
  if (ua) attribution.user_agent = ua;

  // The checkout page the POST was made from. Meta uses it to attribute the
  // event to a page; `referer` is the only header that carries it for a
  // same-origin fetch.
  const referer = clamp(request.headers.get('referer'));
  if (referer) attribution.event_source_url = referer;

  return attribution;
}

/**
 * Narrow an unknown jsonb value read back from Supabase into an Attribution.
 * Returns an empty object for null / non-object columns so callers never have
 * to guard.
 */
export function asAttribution(value: unknown): Attribution {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Attribution;
}
