/**
 * BrandStory — Server Component
 * Premium editorial 2-col layout.
 * Benchmark: Net-a-Porter House Stories, Ogaan brand narrative.
 *
 * Left: large editorial image (portrait, full-bleed within column)
 * Right: eyebrow + Playfair headline + pull-stats + body + ghost CTA
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const STATS = [
  { value: '2,000+', label: 'Designs curated' },
  { value: '15+',    label: 'Years of craft' },
  { value: '50,000+', label: 'Happy customers' },
] as const;

export default function BrandStory() {
  return (
    <section aria-label="The Bansari Story" className="bc-bs-section">
      <div className="bc-bs-container">

        {/* ── Left: editorial image ── */}
        <div className="bc-bs-image-col" aria-hidden="true">
          <div className="bc-bs-img-wrap">
            <ImageWithFallback
              src="/brand/brand-story.jpg"
              alt="Bansari Collections atelier — heritage fabric detail"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 42vw"
              className="bc-bs-img"
            />
            {/* Grain overlay */}
            <div className="bc-bs-grain" aria-hidden="true" />
          </div>
          {/* Pull caption */}
          <p className="bc-bs-caption">
            Crafted in Surat &middot; Worn across India
          </p>
        </div>

        {/* ── Right: editorial copy ── */}
        <div className="bc-bs-copy-col">
          <p className="bc-bs-eyebrow">The Bansari Story</p>

          <h2 className="bc-bs-title">
            Where heritage becomes
            <br />
            <em className="bc-bs-title-em">your story.</em>
          </h2>

          <p className="bc-bs-body">
            Bansari Collections began with a quiet conviction: that Indian
            ethnic wear deserves the same reverence as any global luxury
            maison. From the looms of Surat to celebrations across India,
            every piece we curate is chosen for its craftsmanship, its
            fabric, and the story it carries.
          </p>

          <p className="bc-bs-body" style={{ marginTop: 'var(--bc-space-4)' }}>
            We believe fashion should feel like an heirloom — something
            passed through moments, not seasons. Our atelier works with
            artisans whose knowledge spans generations, translating
            heritage techniques into silhouettes that belong to today.
          </p>

          {/* Pull stats */}
          <div className="bc-bs-stats" role="list">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bc-bs-stat" role="listitem">
                <span className="bc-bs-stat-value">{value}</span>
                <span className="bc-bs-stat-label">{label}</span>
              </div>
            ))}
          </div>

          <Link href="/about" className="bc-bs-cta">
            Read our story &rarr;
          </Link>
        </div>
      </div>

      <style>{`
        .bc-bs-section {
          background-color: var(--bc-surface-ivory);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-bs-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--bc-space-12);
        }
        @media (min-width: 768px) {
          .bc-bs-container {
            grid-template-columns: 42fr 58fr;
            gap: var(--bc-space-16);
            align-items: start;
          }
        }
        @media (min-width: 1024px) {
          .bc-bs-container {
            grid-template-columns: 40fr 60fr;
            gap: var(--bc-space-20);
          }
        }
        /* Image column */
        .bc-bs-image-col { display: flex; flex-direction: column; gap: var(--bc-space-4); }
        .bc-bs-img-wrap {
          position: relative;
          aspect-ratio: var(--bc-ar-occasion);
          overflow: hidden;
          background-color: var(--bc-surface-offset);
        }
        @media (min-width: 768px) {
          .bc-bs-img-wrap {
            position: sticky;
            top: calc(var(--bc-announcement-h, 0px) + 5rem);
          }
        }
        .bc-bs-img { object-fit: cover; object-position: center top; }
        .bc-bs-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }
        .bc-bs-caption {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-faint);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        /* Copy column */
        .bc-bs-copy-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-top: var(--bc-space-2);
        }
        .bc-bs-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-5);
        }
        .bc-bs-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          margin-bottom: var(--bc-space-8);
        }
        .bc-bs-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        .bc-bs-body {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-base);
          line-height: 1.85;
          color: var(--bc-text-muted);
          max-width: 50ch;
        }
        /* Stats */
        .bc-bs-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--bc-space-6);
          margin-top: var(--bc-space-10);
          margin-bottom: var(--bc-space-10);
          padding-top: var(--bc-space-8);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-bs-stat { display: flex; flex-direction: column; gap: var(--bc-space-1); }
        .bc-bs-stat-value {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-xl);
          font-weight: 400;
          color: var(--bc-text-primary);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .bc-bs-stat-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-muted);
          letter-spacing: 0.05em;
        }
        /* CTA */
        .bc-bs-cta {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-text-secondary);
          border-bottom: 1px solid var(--bc-border-default);
          padding-bottom: 2px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: var(--bc-space-1);
          width: fit-content;
          transition: color var(--bc-transition-fast), border-color var(--bc-transition-fast);
        }
        .bc-bs-cta:hover {
          color: var(--bc-brand-mauve);
          border-color: var(--bc-brand-mauve);
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-bs-cta { transition: none; }
        }
      `}</style>
    </section>
  );
}
