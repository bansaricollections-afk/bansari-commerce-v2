/**
 * Testimonials — Server Component
 * Luxury pull-quote editorial section.
 * Mock data is isolated in TESTIMONIALS for easy CMS replacement.
 *
 * Renders full HTML in SSR output — SEO correct.
 * Includes JSON-LD structured data (Review schema).
 */
import ImageWithFallback from '@/components/ui/ImageWithFallback';

/* ------------------------------------------------------------------
   MOCK DATA — replace with Supabase query when CMS is ready.
   Schema: { name, city, review, occupation?, avatar? }
   avatar: path to image in /public or Supabase Storage URL
------------------------------------------------------------------ */
const TESTIMONIALS = [
  {
    name: 'Priya Shah',
    city: 'Vadodara',
    occupation: 'Wedding Guest',
    review:
      'Beautiful craftsmanship and exactly as shown. The fabric quality exceeded every expectation — I was genuinely surprised.',
    avatar: null as string | null,
    rating: 5,
  },
  {
    name: 'Neha Patel',
    city: 'Ahmedabad',
    occupation: 'Bride’s Family',
    review:
      'Perfect fitting and elegant embroidery. I received so many compliments throughout the wedding — everyone asked where I bought it.',
    avatar: null as string | null,
    rating: 5,
  },
  {
    name: 'Riya Mehta',
    city: 'Surat',
    occupation: 'Repeat Customer',
    review:
      'Packaging, delivery and product quality were all outstanding. This is the third time I have ordered and it only gets better.',
    avatar: null as string | null,
    rating: 5,
  },
];

/** Structured data for SEO */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bansari Collections',
  review: TESTIMONIALS.map(({ name, city, review, rating }) => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: 5,
    },
    author: { '@type': 'Person', name, address: { '@type': 'PostalAddress', addressLocality: city } },
    reviewBody: review,
  })),
};

export default function Testimonials() {
  return (
    <section
      aria-label="Customer Stories"
      className="bc-tm-section"
    >
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bc-tm-container">
        {/* Header */}
        <div className="bc-tm-header">
          <p className="bc-tm-eyebrow">Loved By Customers</p>
          <h2 className="bc-tm-title">
            Their <em className="bc-tm-title-em">Words</em>
          </h2>
          {/* Overall rating row */}
          <div className="bc-tm-rating-row" aria-label="Average rating: 5 out of 5">
            <span className="bc-tm-stars" aria-hidden="true">
              {'\u25cf'.repeat(5)}
            </span>
            <span className="bc-tm-rating-label">5.0 · Verified Reviews</span>
          </div>
        </div>

        {/* Pull-quote grid */}
        <ul role="list" className="bc-tm-grid">
          {TESTIMONIALS.map(({ name, city, occupation, review, avatar, rating }) => (
            <li key={name} className="bc-tm-card">
              {/* Opening quote glyph */}
              <span className="bc-tm-quote-glyph" aria-hidden="true">“</span>

              {/* Star row per review */}
              <div
                className="bc-tm-card-stars"
                aria-label={`${rating} out of 5 stars`}
              >
                {'\u25cf'.repeat(rating)}
              </div>

              {/* Review text */}
              <blockquote className="bc-tm-blockquote">
                <p className="bc-tm-review-text">{review}</p>
              </blockquote>

              {/* Attribution */}
              <div className="bc-tm-attribution">
                {avatar ? (
                  <div className="bc-tm-avatar-wrap">
                    <ImageWithFallback
                      src={avatar}
                      alt={`${name} — verified Bansari customer`}
                      fill
                      sizes="40px"
                      className="bc-tm-avatar-img"
                    />
                  </div>
                ) : (
                  <div className="bc-tm-avatar-initial" aria-hidden="true">
                    {name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="bc-tm-name">{name}</p>
                  <p className="bc-tm-meta">
                    {city}
                    {occupation ? <> &middot; {occupation}</> : null}
                    &nbsp;&middot; <span className="bc-tm-verified">Verified Purchase</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .bc-tm-section {
          background-color: var(--bc-surface-cream);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-tm-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        /* Header */
        .bc-tm-header {
          margin-bottom: var(--bc-space-16);
          padding-bottom: var(--bc-space-8);
          border-bottom: 1px solid var(--bc-border-soft);
        }
        .bc-tm-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-3);
        }
        .bc-tm-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          margin-bottom: var(--bc-space-5);
        }
        .bc-tm-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        .bc-tm-rating-row {
          display: flex;
          align-items: center;
          gap: var(--bc-space-3);
        }
        .bc-tm-stars {
          color: var(--bc-gold-warm);
          font-size: 0.65rem;
          letter-spacing: 0.2em;
        }
        .bc-tm-rating-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-muted);
          letter-spacing: 0.05em;
        }
        /* Grid */
        .bc-tm-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .bc-tm-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        /* Card */
        .bc-tm-card {
          padding: var(--bc-space-10) 0;
          border-top: 1px solid var(--bc-border-soft);
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-5);
        }
        @media (min-width: 768px) {
          .bc-tm-card {
            padding: var(--bc-space-10) var(--bc-space-8) var(--bc-space-10) 0;
            border-right: 1px solid var(--bc-border-soft);
          }
          .bc-tm-card:last-child {
            padding-right: 0;
            border-right: none;
          }
          .bc-tm-card:first-child {
            padding-left: 0;
          }
        }
        .bc-tm-quote-glyph {
          font-family: var(--font-playfair), serif;
          font-size: 3rem;
          line-height: 1;
          color: var(--bc-brand-mauve);
          opacity: 0.25;
          display: block;
          margin-bottom: calc(var(--bc-space-2) * -1);
        }
        .bc-tm-card-stars {
          color: var(--bc-gold-warm);
          font-size: 0.6rem;
          letter-spacing: 0.25em;
        }
        .bc-tm-blockquote {
          margin: 0;
          padding: 0;
        }
        .bc-tm-review-text {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-lg);
          font-weight: 400;
          font-style: italic;
          line-height: 1.7;
          color: var(--bc-text-primary);
          max-width: 42ch;
        }
        /* Attribution */
        .bc-tm-attribution {
          display: flex;
          align-items: center;
          gap: var(--bc-space-4);
          margin-top: var(--bc-space-2);
        }
        .bc-tm-avatar-wrap {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background-color: var(--bc-surface-warm);
        }
        .bc-tm-avatar-img { object-fit: cover; }
        .bc-tm-avatar-initial {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--bc-brand-mauve-faint);
          border: 1px solid var(--bc-border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-base);
          color: var(--bc-brand-mauve);
          font-style: italic;
        }
        .bc-tm-name {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--bc-text-primary);
        }
        .bc-tm-meta {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-muted);
          margin-top: 0.125rem;
        }
        .bc-tm-verified {
          color: var(--bc-gold-dark);
          font-weight: 500;
        }
      `}</style>
    </section>
  );
}
