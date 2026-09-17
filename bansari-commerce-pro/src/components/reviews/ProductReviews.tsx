import { Star, BadgeCheck } from 'lucide-react';

import type { PublicReview, ProductRatingSummary } from '@/services/review.service';

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          aria-hidden="true"
          fill={i < Math.round(rating) ? 'var(--bc-gold)' : 'var(--bc-border)'}
        />
      ))}
    </div>
  );
}

/**
 * Customer reviews on the product page.
 *
 * RENDERS NOTHING WHEN THERE ARE NO REVIEWS.
 * Not an empty state, not "Be the first to review" — nothing. An empty review
 * section on every product advertises that nobody has bought anything, which
 * is worse for a new boutique than simply not raising the subject. It appears
 * the day a real review is approved and not before.
 *
 * Every review shown is tied to a delivered order line, so the verified badge
 * is a statement about the data, not decoration.
 */
export default function ProductReviews({
  reviews,
  summary,
}: {
  reviews: PublicReview[];
  summary: ProductRatingSummary;
}) {
  if (summary.count === 0 || reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="product-reviews-heading"
      className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
      style={{ borderTop: '1px solid var(--bc-border-soft)' }}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        {/* ── Summary ── */}
        <header className="lg:pt-1">
          <div className="flex items-center gap-3">
            <span aria-hidden className="block h-px w-8" style={{ backgroundColor: 'var(--bc-gold)' }} />
            <p
              className="text-[10px] font-medium uppercase tracking-[0.3em]"
              style={{ color: 'var(--bc-gold-dark)' }}
            >
              Worn &amp; Reviewed
            </p>
          </div>

          <h2
            id="product-reviews-heading"
            className="mt-4 font-[family:var(--font-playfair)] text-2xl leading-tight sm:text-3xl"
            style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
          >
            What customers <em className="italic">say</em>
          </h2>

          <div className="mt-5 flex items-baseline gap-3">
            <span
              className="font-[family:var(--font-playfair)] text-4xl"
              style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
            >
              {summary.average.toFixed(1)}
            </span>
            <div className="flex flex-col gap-1">
              <Stars rating={summary.average} size={15} />
              <span className="text-[12px]" style={{ color: 'var(--bc-text-muted)' }}>
                {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          {/* Distribution, rendered only for ratings that actually occur. */}
          <dl className="mt-6 flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star] ?? 0;
              if (n === 0) return null;
              const pct = Math.round((n / summary.count) * 100);
              return (
                <div key={star} className="flex items-center gap-3">
                  <dt
                    className="w-10 shrink-0 text-[11px] tabular-nums"
                    style={{ color: 'var(--bc-text-muted)' }}
                  >
                    {star} ★
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    <span
                      className="h-1 flex-1"
                      aria-hidden
                      style={{ backgroundColor: 'var(--bc-border-soft)' }}
                    >
                      <span
                        className="block h-full"
                        style={{ width: `${pct}%`, backgroundColor: 'var(--bc-gold)' }}
                      />
                    </span>
                    <span
                      className="w-8 shrink-0 text-right text-[11px] tabular-nums"
                      style={{ color: 'var(--bc-text-muted)' }}
                    >
                      {n}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="mt-6 max-w-sm text-[12px] leading-relaxed" style={{ color: 'var(--bc-text-muted)' }}>
            Only customers who bought and received this piece can review it. We publish
            honest reviews, including critical ones.
          </p>
        </header>

        {/* ── The reviews ── */}
        <ul className="flex flex-col">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="py-6 first:pt-0"
              style={{ borderBottom: '1px solid var(--bc-border-soft)' }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={r.rating} />
                {r.verifiedPurchase && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em]"
                    style={{ color: 'var(--bc-gold-dark)' }}
                  >
                    <BadgeCheck size={12} aria-hidden="true" /> Verified Purchase
                  </span>
                )}
              </div>

              {r.title && (
                <p
                  className="mt-3 font-[family:var(--font-playfair)] text-lg"
                  style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
                >
                  {r.title}
                </p>
              )}

              {r.body && (
                <p
                  className="mt-2 whitespace-pre-line text-[15px] leading-relaxed"
                  style={{ color: 'var(--bc-text-secondary)' }}
                >
                  {r.body}
                </p>
              )}

              <p className="mt-3 text-[11px] tracking-[0.04em]" style={{ color: 'var(--bc-text-muted)' }}>
                {r.authorName} ·{' '}
                {new Date(r.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
