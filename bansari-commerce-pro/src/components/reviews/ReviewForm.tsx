'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

import type { ReviewInvitation } from '@/services/review.service';

/**
 * The review form itself.
 *
 * Deliberately short. Rating is the only required field beyond a name — most
 * people will leave a rating and nothing else, and a long form is how you turn
 * a willing reviewer into no review at all. Title and words are optional.
 *
 * The form sends the token back rather than an order id: the server re-derives
 * everything from the signature, so nothing here can claim a purchase.
 */
export default function ReviewForm({
  token,
  invitation,
}: {
  token: string;
  invitation: ReviewInvitation;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState(invitation.suggestedName);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (rating < 1) {
      setError('Please choose a star rating.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, authorName, title, body }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message ?? `Could not save your review (${res.status}).`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your review.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className="mt-8 p-6"
        style={{ border: '1px solid var(--bc-border-soft)', backgroundColor: '#FFFFFF' }}
      >
        <p
          className="font-[family:var(--font-playfair)] text-xl"
          style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
        >
          Thank you — that means a great deal.
        </p>
        {/*
          Said plainly. A review that appears instantly and then vanishes into
          moderation is worse than one that never claimed to be published.
        */}
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'var(--bc-text-secondary)' }}>
          Your review has been sent to us and will appear on the product page once we have
          read it. We publish honest reviews, including critical ones.
        </p>
      </div>
    );
  }

  const inputStyle = {
    border: '1px solid var(--bc-border)',
    backgroundColor: '#FFFFFF',
    color: 'var(--bc-text-primary)',
  } as const;

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-6">
      {/* ── Rating ── */}
      <fieldset>
        <legend
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--bc-text-primary)' }}
        >
          Your rating
        </legend>
        <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={rating === n}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={30}
                  strokeWidth={1}
                  aria-hidden="true"
                  style={{
                    fill: filled ? 'var(--bc-gold)' : 'transparent',
                    color: filled ? 'var(--bc-gold)' : 'var(--bc-text-faint)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Name ── */}
      <label className="flex flex-col gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--bc-text-primary)' }}
        >
          Publish as
        </span>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          required
          maxLength={80}
          className="px-4 py-3 text-[15px] outline-none"
          style={inputStyle}
        />
        <span className="text-[12px]" style={{ color: 'var(--bc-text-muted)' }}>
          Shown with your review. Your email is never published.
        </span>
      </label>

      {/* ── Optional detail ── */}
      <label className="flex flex-col gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--bc-text-primary)' }}
        >
          Headline <span style={{ color: 'var(--bc-text-muted)' }}>(optional)</span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Beautiful fabric, true to size"
          className="px-4 py-3 text-[15px] outline-none"
          style={inputStyle}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--bc-text-primary)' }}
        >
          Your review <span style={{ color: 'var(--bc-text-muted)' }}>(optional)</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={6}
          placeholder="How is the fit? The fabric? Would you buy it again?"
          className="resize-none px-4 py-3 text-[15px] leading-relaxed outline-none"
          style={inputStyle}
        />
      </label>

      {error && (
        <p role="alert" className="text-[14px]" style={{ color: '#B91C1C' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="bc-cta-primary self-start">
        {busy ? 'Sending…' : 'Submit Review'}
      </button>
    </form>
  );
}
