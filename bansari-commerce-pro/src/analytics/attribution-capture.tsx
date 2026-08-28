'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { effectiveConsent } from '@/analytics/consent';

/**
 * AttributionCapture
 * ------------------
 * Records WHERE a visitor came from into a first-party cookie the server can
 * read at checkout.
 *
 * The Meta Pixel already writes `_fbc`/`_fbp` for Meta clicks, but that covers
 * exactly one platform and only via its own script. This covers every channel
 * — Google, WhatsApp, influencer links, email — including ones whose tag is
 * not installed yet, so a campaign can be attributed retroactively once the
 * data exists.
 *
 * ATTRIBUTION MODEL: last non-direct paid touch.
 *
 * The cookie is written on the first visit and afterwards ONLY overwritten by
 * a visit that carries a click id or a utm_source. A customer who clicks an ad
 * today, leaves, and returns via a bookmark next week is still credited to the
 * ad — a plain direct return must not wipe the campaign that paid for it.
 * `first_seen` is preserved across overwrites so the full window stays visible.
 *
 * WHY A COOKIE AND NOT localStorage: only a cookie is sent with the
 * create-order request, and that request is the one moment the server can
 * durably attach attribution to an order. See src/lib/attribution.ts.
 *
 * Non-essential analytics data. It is deliberately first-party, SameSite=Lax,
 * non-HttpOnly (written by JS), and holds no personal information — only
 * campaign identifiers the ad platform itself put in the URL. When the consent
 * banner lands in Phase 4 this write becomes conditional on consent.
 */

const COOKIE_NAME = 'bc_attr';
const MAX_AGE_DAYS = 90;

/** Click identifiers, in the order platforms should be credited. */
const CLICK_IDS = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid'] as const;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** Matches the server-side cap in src/lib/attribution.ts. */
const MAX_FIELD = 512;

type AttrRecord = Record<string, string>;

function readCookie(): AttrRecord | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as AttrRecord;
    }
  } catch {
    // Corrupt cookie — treated as absent and replaced below.
  }
  return null;
}

function writeCookie(record: AttrRecord): void {
  const value = encodeURIComponent(JSON.stringify(record));
  // Cookies are capped at ~4KB by every browser; a value near the limit is
  // silently dropped, taking the existing attribution with it.
  if (value.length > 3500) return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export default function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    /*
     * Consent gate. bc_attr is a marketing cookie, not a functional one — it
     * exists solely to attribute an order to an ad click — so it must not be
     * written by a visitor who has declined, nor by a European visitor who has
     * not yet answered.
     *
     * Checked inside the effect rather than at module scope so it re-evaluates
     * on every navigation: a visitor who accepts partway through a session
     * starts being attributed from that point on, without a reload.
     */
    if (effectiveConsent() !== 'granted') return;

    /*
     * `window.location.search` rather than useSearchParams(): this component
     * is mounted in the root layout, and useSearchParams() there forces every
     * route in the app out of static rendering (and demands a Suspense
     * boundary). Inside an effect we are already client-only and the current
     * URL is authoritative, so the hook buys nothing and costs the whole
     * site's static generation.
     */
    const params = new URLSearchParams(window.location.search);

    const get = (key: string): string | undefined => {
      const raw = params.get(key);
      if (!raw) return undefined;
      const trimmed = raw.trim().slice(0, MAX_FIELD);
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const incoming: AttrRecord = {};
    for (const key of [...UTM_KEYS, ...CLICK_IDS]) {
      const value = get(key);
      if (value) incoming[key] = value;
    }

    const existing = readCookie();
    const isPaidTouch = Object.keys(incoming).length > 0;

    // Nothing new to record and a cookie already exists — the common case on
    // every internal navigation. Do no work.
    if (!isPaidTouch && existing) return;

    const now = new Date().toISOString();
    const record: AttrRecord = {
      ...incoming,
      landing_path: pathname.slice(0, MAX_FIELD),
      first_seen: existing?.first_seen ?? now,
    };

    // Only an external referrer is informative; our own pages are noise.
    if (document.referrer) {
      try {
        const referrerHost = new URL(document.referrer).hostname;
        if (referrerHost !== window.location.hostname) {
          record.referrer = document.referrer.slice(0, MAX_FIELD);
        }
      } catch {
        // Unparseable referrer — omit it rather than store junk.
      }
    }

    writeCookie(record);
  }, [pathname]);

  return null;
}
