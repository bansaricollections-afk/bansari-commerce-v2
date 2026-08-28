'use client';

import { reopenConsentNotice } from '@/analytics/consent';

/**
 * Footer control that brings the cookie notice back.
 *
 * A visitor who declines must be able to change their mind, and one who
 * accepted must be able to withdraw — a choice that can only be made once, at
 * the moment of arrival, is not really a choice.
 *
 * Its own client component so Footer can stay a server component: only this
 * button needs an onClick handler, and making the whole footer client-side to
 * get it would ship the entire footer's markup as JavaScript for no reason.
 *
 * Rendered unconditionally rather than only when a choice exists. Testing for
 * a cookie would make the footer's output depend on client state, which either
 * causes a hydration mismatch or forces the footer out of static rendering —
 * and the link is harmless when no choice has been made, since it simply
 * reopens a notice that is already on screen.
 */
export default function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={reopenConsentNotice}
      style={{
        fontSize: 'var(--bc-text-xs)',
        opacity: 0.35,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'inherit',
        font: 'inherit',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      }}
    >
      Cookie preferences
    </button>
  );
}
