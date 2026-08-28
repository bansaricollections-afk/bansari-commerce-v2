'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';

import {
  readConsent,
  setConsent,
  isLikelyEeaOrUk,
  subscribeConsent,
} from '@/analytics/consent';

/**
 * ConsentNotice — the storefront cookie notice.
 *
 * Opt-out model: measurement is already running for this store's Indian
 * market when the notice appears, and Decline switches it off. For EEA/UK
 * visitors the tags start denied (see analytics/consent.ts), so for them this
 * is a genuine opt-in and Accept is what starts tracking.
 *
 * Deliberately a bottom bar rather than a modal. A blocking overlay on a
 * storefront costs conversions, and for the opt-out majority there is nothing
 * to block — the notice informs and offers a choice rather than demanding one
 * before the shop can be seen.
 *
 * Styling follows the editorial convention of src/components/home/* — inline
 * style objects referencing the brand tokens, sharp corners (--radius-* is 0
 * brand-wide), Playfair for the heading, Inter for body and controls.
 */
export default function ConsentNotice() {
  /*
   * useSyncExternalStore rather than useState + useEffect.
   *
   * Whether to show this depends on a cookie and the visitor's timezone,
   * neither of which exists during SSR. The obvious `useState(false)` plus an
   * effect that flips it works, but sets state synchronously inside an effect
   * — which this repo's lint rules reject, and which causes a cascading
   * second render on every page load.
   *
   * The server snapshot returns `true` ("already answered"), so the server
   * renders nothing and there is no hydration mismatch. The client snapshot
   * reads the real cookie, and the notice appears only where it should.
   */
  const hasAnswered = useSyncExternalStore(
    subscribeConsent,
    () => readConsent() !== null,
    () => true
  );

  /*
   * The slide-out is driven through a ref rather than state.
   *
   * A `leaving` state flag would persist after the store unmounts this, so
   * reopening via the footer's "Cookie preferences" link would bring the
   * notice back already translated off-screen and invisible. Touching the
   * node directly means every reopen starts from a clean element.
   */
  const panelRef = useRef<HTMLDivElement | null>(null);

  function choose(state: 'granted' | 'denied') {
    /*
     * Animate first, write second. Writing immediately flips the store and
     * unmounts synchronously, so the transition would never be seen. The
     * store — not a local flag — owns visibility, which is what allows the
     * footer link to bring this back: clearing the cookie notifies
     * subscribers and this re-renders.
     */
    const panel = panelRef.current;
    if (panel) {
      panel.style.transform = 'translateY(100%)';
      panel.style.opacity = '0';
    }
    setTimeout(() => setConsent(state), 240);
  }

  if (hasAnswered) return null;

  const strict = isLikelyEeaOrUk();

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      ref={panelRef}
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 'var(--bc-z-toast)' as unknown as number,
        background: 'var(--bc-dark)',
        borderTop: '1px solid var(--bc-border-gold)',
        transform: 'translateY(0)',
        opacity: 1,
        transition: 'transform var(--bc-base-t), opacity var(--bc-base-t)',
      }}
    >
      <div
        className="mx-auto flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
        style={{
          maxWidth: 'var(--bc-wide)',
          paddingInline: 'var(--bc-gutter)',
          paddingBlock: 'clamp(1.25rem, 2.5vw, 1.75rem)',
        }}
      >
        <div style={{ maxWidth: '62ch' }}>
          <p
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: 'var(--bc-md)',
              color: 'var(--bc-text-inverse)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            A note on cookies
          </p>
          <p
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: 'var(--bc-sm)',
              lineHeight: 1.65,
              color: 'rgba(255,253,249,0.68)',
              margin: '0.5rem 0 0',
              fontWeight: 300,
            }}
          >
            {strict
              ? 'We would like to use cookies to measure how our collections are discovered and to understand which of our advertisements bring you here. Nothing is measured until you choose.'
              : 'We use cookies to measure how our collections are discovered and to understand which of our advertisements bring you here. You can decline at any time.'}{' '}
            <Link
              href="/privacy-policy"
              style={{
                color: 'var(--bc-gold-light)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Read our privacy policy
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/*
            Decline is a ghost control and Accept is the gold primary, matching
            the CTA hierarchy used across the site. Both are real, equally
            reachable buttons — the decline path is not hidden behind a
            secondary screen, which is the pattern regulators object to.
          */}
          <button
            type="button"
            onClick={() => choose('denied')}
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '0.9375rem 1.75rem',
              background: 'transparent',
              color: 'var(--bc-text-inverse)',
              border: '1px solid rgba(255,253,249,0.28)',
              cursor: 'pointer',
              transition: 'border-color var(--bc-fast), background var(--bc-fast)',
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="bc-cta-primary"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
