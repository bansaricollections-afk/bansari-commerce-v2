"use client";

import { useReducer, useRef } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type State =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'duplicate'; message: string }
  | { status: 'error'; message: string };

type Action =
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS'; message: string }
  | { type: 'DUPLICATE'; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case 'SUBMIT':    return { status: 'submitting' };
    case 'SUCCESS':   return { status: 'success',   message: action.message };
    case 'DUPLICATE': return { status: 'duplicate', message: action.message };
    case 'ERROR':     return { status: 'error',     message: action.message };
    case 'RESET':     return { status: 'idle' };
  }
}

export default function Newsletter() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inputRef.current?.value.trim() ?? '';

    if (!EMAIL_RE.test(email)) {
      dispatch({ type: 'ERROR', message: 'Please enter a valid email address.' });
      return;
    }

    dispatch({ type: 'SUBMIT' });

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage_footer' }),
      });

      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        alreadySubscribed?: boolean;
        errorMessage?: string;
      };

      if (!res.ok || !json.success) {
        dispatch({
          type: 'ERROR',
          message: json.errorMessage ?? 'Something went wrong. Please try again.',
        });
        return;
      }

      if (json.alreadySubscribed) {
        dispatch({
          type: 'DUPLICATE',
          message: json.message ?? "You\u2019re already on the list \u2014 thank you!",
        });
      } else {
        dispatch({
          type: 'SUCCESS',
          message: json.message ?? "You\u2019re on the list. Welcome to Bansari.",
        });
      }
    } catch {
      dispatch({
        type: 'ERROR',
        message: 'Network error. Please check your connection and try again.',
      });
    }
  }

  const isSubmitting = state.status === 'submitting';
  const isDone = state.status === 'success' || state.status === 'duplicate';

  return (
    <section
      aria-label="Bansari Priv\u00e9 Club newsletter sign-up"
      style={{
        backgroundColor: 'var(--bc-surface-dark)',
        paddingBlock: 'var(--bc-section-padding)',
      }}
    >
      <div className="mx-auto bc-nl-grid" style={{ maxWidth: 'var(--bc-content-wide)', paddingInline: 'var(--bc-gutter)' }}>

        {/* Left — editorial headline */}
        <div>
          <p className="bc-nl-eyebrow">Bansari Priv\u00e9</p>
          <h2 className="bc-nl-headline">
            Be first to discover
            <br />
            <em>every collection.</em>
          </h2>
          <p className="bc-nl-subtext">
            Early access to new arrivals, festive edits, exclusive member offers
            and styling inspiration \u2014 delivered directly to your inbox.
          </p>
        </div>

        {/* Right — form or confirmation */}
        <div>
          {/* Confirmation states */}
          {isDone && (
            <div role="status" aria-live="polite" className="bc-nl-confirm">
              <span className="bc-nl-confirm-icon" aria-hidden="true">
                {state.status === 'success' ? '\u2713' : '\u2665'}
              </span>
              <p className="bc-nl-confirm-msg">{state.message}</p>
              <p className="bc-nl-confirm-sub">
                {state.status === 'success'
                  ? 'Watch your inbox for the first edit.'
                  : 'We already have your address on file.'}
              </p>
            </div>
          )}

          {/* Form — hidden once done */}
          {!isDone && (
            <form onSubmit={handleSubmit} noValidate className="bc-nl-form">
              <label htmlFor="newsletter-email" className="bc-nl-label">
                Your email address
              </label>

              <input
                ref={inputRef}
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                className="bc-nl-input"
                aria-describedby={state.status === 'error' ? 'nl-error' : undefined}
              />

              {state.status === 'error' && (
                <p id="nl-error" role="alert" className="bc-nl-error">
                  {state.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="bc-nl-btn"
              >
                {isSubmitting ? 'Subscribing\u2026' : 'Join Priv\u00e9'}
              </button>

              <p className="bc-nl-legal">No spam. Unsubscribe at any time.</p>
            </form>
          )}

          {/* Benefit chips */}
          <div className="bc-nl-chips">
            {['Early Access', 'Member Offers', 'Style Tips', 'Celebration Edits'].map((b) => (
              <span key={b} className="bc-nl-chip">{b}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .bc-nl-grid {
          display: grid;
          gap: var(--bc-space-16);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .bc-nl-grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--bc-space-24);
            align-items: center;
          }
        }
        .bc-nl-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-5);
        }
        .bc-nl-headline {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: var(--bc-text-inverse);
          margin-bottom: var(--bc-space-6);
        }
        .bc-nl-headline em { font-style: italic; }
        .bc-nl-subtext {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          line-height: 1.8;
          color: var(--bc-text-inverse);
          opacity: 0.55;
          max-width: 38ch;
        }
        .bc-nl-form {
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-3);
        }
        .bc-nl-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bc-text-inverse);
          opacity: 0.6;
        }
        .bc-nl-input {
          height: 3.25rem;
          background: transparent;
          border: 1px solid var(--bc-border-dark);
          color: var(--bc-text-inverse);
          font-size: var(--bc-text-sm);
          padding: 0 1.25rem;
          outline: none;
          font-family: inherit;
          transition: border-color var(--bc-transition-fast);
          width: 100%;
        }
        .bc-nl-input::placeholder { opacity: 0.35; color: var(--bc-text-inverse); }
        .bc-nl-input:focus { border-color: var(--bc-gold-warm); }
        .bc-nl-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .bc-nl-error {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: #f87171;
          margin-top: calc(var(--bc-space-1) * -1);
        }
        .bc-nl-btn {
          height: 3.25rem;
          background-color: var(--bc-gold-warm);
          border: none;
          color: var(--bc-surface-dark);
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity var(--bc-transition-fast);
          width: 100%;
        }
        .bc-nl-btn:hover:not(:disabled) { opacity: 0.88; }
        .bc-nl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bc-nl-legal {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-inverse);
          opacity: 0.35;
          margin-top: var(--bc-space-1);
        }
        /* Confirmation block */
        .bc-nl-confirm {
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-3);
          padding: var(--bc-space-8);
          border: 1px solid var(--bc-border-dark);
          margin-bottom: var(--bc-space-6);
        }
        .bc-nl-confirm-icon {
          font-size: var(--bc-text-xl);
          color: var(--bc-gold-warm);
          line-height: 1;
        }
        .bc-nl-confirm-msg {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-lg);
          font-weight: 400;
          font-style: italic;
          color: var(--bc-text-inverse);
          line-height: 1.4;
        }
        .bc-nl-confirm-sub {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-inverse);
          opacity: 0.5;
        }
        /* Benefit chips */
        .bc-nl-chips {
          display: flex;
          flex-wrap: wrap;
          gap: var(--bc-space-3);
          margin-top: var(--bc-space-10);
        }
        .bc-nl-chip {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--bc-text-inverse);
          opacity: 0.45;
          border: 1px solid var(--bc-border-dark);
          padding: 0.375rem 0.875rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-nl-input, .bc-nl-btn { transition: none; }
        }
      `}</style>
    </section>
  );
}
