/**
 * consent.ts
 * ----------
 * One place that decides whether this visitor may be tracked, and tells every
 * destination about it.
 *
 * THE MODEL: OPT-OUT, WITH A STRICTER DEFAULT FOR EUROPE
 *
 * This store sells into India, where an opt-out notice is the proportionate
 * approach and a blocking cookie wall would cost real conversions for no
 * benefit. So measurement runs by default and the visitor can decline.
 *
 * That is NOT acceptable for EEA/UK visitors, where consent must be given
 * before tracking begins. Rather than pick one behaviour for everyone, the
 * default is region-dependent:
 *
 *   Google  — Consent Mode v2 supports region-scoped defaults natively. A
 *             `region: [...]` default of "denied" is declared for the EEA and
 *             UK, and a separate "granted" default for everywhere else.
 *             Google resolves the visitor's region itself, by IP, before any
 *             tag fires. See google-tag.tsx.
 *
 *   Meta    — fbq has no region concept, so the browser has to decide. The
 *             timezone heuristic below is used: it needs no extra request and
 *             cannot be blocked, unlike an IP lookup.
 *
 * WHAT "DENIED" ACTUALLY STOPS
 *
 * Declining is not cosmetic here. It stops the bc_attr attribution cookie
 * being written (attribution-capture.tsx), revokes the Meta pixel, sets all
 * four Consent Mode v2 signals to denied, and — because consent cannot live
 * only in the browser — is recorded on the order so the server-side
 * Conversions API withholds the customer's hashed email and phone. See
 * lib/meta-capi.ts.
 */

/** Cookie name. Readable server-side, which is the point — see lib/attribution.ts. */
export const CONSENT_COOKIE = 'bc_consent';

/** Six months. Long enough not to nag, short enough to re-ask periodically. */
const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentState = 'granted' | 'denied';

/**
 * Timezone-based EEA/UK detection.
 *
 * Deliberately a heuristic, not a guarantee. It is used ONLY to choose a
 * stricter DEFAULT for the Meta pixel before the visitor has answered — never
 * to override an explicit choice. A false positive means a European-timezone
 * visitor in Mumbai sees the notice before Meta tracking starts, which is
 * harmless. A false negative is the case worth avoiding, so anything under
 * `Europe/` counts, including non-EEA zones like Europe/Moscow: erring toward
 * "ask first" is the safe direction.
 *
 * Google does not rely on this at all — Consent Mode resolves region by IP.
 */
export function isLikelyEeaOrUk(): boolean {
  if (typeof Intl === 'undefined') return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return tz.startsWith('Europe/') || tz === 'Atlantic/Reykjavik' || tz === 'Atlantic/Canary';
  } catch {
    return false;
  }
}

/** The stored choice, or null when the visitor has not answered yet. */
export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(CONSENT_COOKIE.length + 1);
  return value === 'granted' || value === 'denied' ? value : null;
}

/**
 * What applies right now: the explicit choice if one exists, otherwise the
 * regional default. This is the function every caller should use.
 */
export function effectiveConsent(): ConsentState {
  return readConsent() ?? (isLikelyEeaOrUk() ? 'denied' : 'granted');
}

export function writeConsent(state: ConsentState): void {
  if (typeof document === 'undefined') return;
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${state}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Push the decision to Google and Meta.
 *
 * Safe to call before either library has loaded. gtag is defined by the
 * beforeInteractive snippet and queues onto dataLayer; fbq has its own queue.
 * A call made during hydration is therefore not lost — which is exactly the
 * bug that made ViewContent silently vanish before the tags were moved to
 * beforeInteractive.
 */
export function applyConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;

  const value = state === 'granted' ? 'granted' : 'denied';

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage: value,
      analytics_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    });
  }

  if (typeof window.fbq === 'function') {
    // Meta's API is the inverse shape: grant/revoke rather than a map.
    window.fbq('consent', state === 'granted' ? 'grant' : 'revoke');
  }
}

/** Convenience for the banner: record the choice and apply it in one step. */
export function setConsent(state: ConsentState): void {
  writeConsent(state);
  applyConsent(state);
}
