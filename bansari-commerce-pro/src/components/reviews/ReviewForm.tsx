'use client';

import { useState } from 'react';
import { Star, ImagePlus, X } from 'lucide-react';

import type { ReviewInvitation } from '@/services/review.service';
import { REVIEW_REWARD } from '@/lib/review-reward';

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function addPhoto(file: File) {
    if (photos.length >= 5) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      const res = await fetch('/api/reviews/photo', { method: 'POST', body: fd });
      const json = (await res.json()) as { success?: boolean; url?: string; message?: string };
      if (!res.ok || json?.success === false || !json.url) {
        throw new Error(json?.message ?? 'That photo could not be uploaded.');
      }
      setPhotos((prev) => [...prev, json.url as string]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

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
        body: JSON.stringify({ token, rating, authorName, title, body, photos }),
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
          {photos.length > 0
            ? ` Because you added a photo, we will email you a ${REVIEW_REWARD.percentOff}% discount code for your next order as soon as it is approved.`
            : ''}
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

      {/* ── Photos ──
         Optional, and the reward is stated plainly rather than dangled. The
         code is issued for a photo review of ANY rating — saying so here
         matters, because an incentive that looks conditional on praise makes
         every review on the site less believable. */}
      <div className="flex flex-col gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--bc-text-primary)' }}
        >
          Add a photo <span style={{ color: 'var(--bc-text-muted)' }}>(optional)</span>
        </span>

        <div
          className="flex flex-col gap-3 p-4"
          style={{ border: '1px solid var(--bc-border-gold)', backgroundColor: 'var(--bc-gold-faint)' }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--bc-text-secondary)' }}>
            Add a photo of the piece and we will send you{' '}
            <strong style={{ color: 'var(--bc-text-primary)' }}>
              {REVIEW_REWARD.percentOff}% off your next order
            </strong>{' '}
            as a thank-you. The code is yours whatever you write — we are asking for your
            honest opinion, not a kind one.
          </p>

          {photos.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <li key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Your review photo"
                    className="h-20 w-20 object-cover"
                    style={{ border: '1px solid var(--bc-border)' }}
                  />
                  <button
                    type="button"
                    aria-label="Remove this photo"
                    onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--bc-text-primary)', color: 'var(--bc-surface-cream)' }}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photos.length < 5 && (
            <label
              className="inline-flex cursor-pointer items-center gap-2 self-start px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ border: '1px solid var(--bc-text-primary)', color: 'var(--bc-text-primary)' }}
            >
              <ImagePlus size={14} aria-hidden="true" />
              {uploading ? 'Uploading…' : photos.length ? 'Add another' : 'Choose a photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // Reset so choosing the same file twice still fires onChange.
                  e.target.value = '';
                  if (f) void addPhoto(f);
                }}
              />
            </label>
          )}

          <p className="text-[11px]" style={{ color: 'var(--bc-text-muted)' }}>
            JPEG, PNG or WebP, up to 5 MB. Up to five photos.
          </p>
        </div>
      </div>

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
