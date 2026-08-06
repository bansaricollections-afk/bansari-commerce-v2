/**
 * BrandStory — Server Component
 * Luxury editorial brand narrative section.
 * Benchmark: Ogaan, Aza Fashions.
 *
 * Layout:
 *   Desktop: 5/12 large italic headline | 7/12 prose + craft stats
 *   Mobile: stacked, headline first
 */
import Link from 'next/link';

const craftStats = [
  { value: '30+', label: 'Years of Craft' },
  { value: '5,000+', label: 'Artisan Hands' },
  { value: '400+', label: 'Curated Styles' },
];

export default function BrandStory() {
  return (
    <section
      aria-label="Our Story"
      className="bc-bs-section"
    >
      <div className="bc-bs-container">
        {/* Gold rule above heading */}
        <div className="bc-bs-rule" aria-hidden="true" />

        <div className="bc-bs-grid">
          {/* ── Left: editorial headline ── */}
          <div className="bc-bs-headline-col">
            <p className="bc-bs-eyebrow">Our Philosophy</p>
            <h2 className="bc-bs-headline">
              <em>Craft</em> that carries
              <br />
              a generation’s
              <br />
              <em>memory.</em>
            </h2>
          </div>

          {/* ── Right: prose + stats + CTA ── */}
          <div className="bc-bs-content-col">
            <p className="bc-bs-lead">
              Bansari Collections was born from a single conviction:
              that the finest Indian textiles deserve to be worn, not
              archived. We source directly from weaving communities
              across Gujarat, Rajasthan and Varanasi — so every piece
              carries the weight of an unbroken tradition.
            </p>
            <p className="bc-bs-body">
              Each garment passes through the hands of master craftspeople
              before it reaches you. We do not rush this process. We do not
              substitute machine embroidery for zardozi. What you receive
              is the real thing.
            </p>

            {/* Craft stats */}
            <ul role="list" className="bc-bs-stats">
              {craftStats.map(({ value, label }) => (
                <li key={label} className="bc-bs-stat">
                  <span className="bc-bs-stat-value">{value}</span>
                  <span className="bc-bs-stat-label">{label}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="bc-bs-cta-row">
              <Link href="/shop" className="bc-bs-cta-primary">
                Shop The Collection
              </Link>
              <Link href="/about" className="bc-bs-cta-secondary">
                Read Our Story
              </Link>
            </div>
          </div>
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
        }
        .bc-bs-rule {
          width: 48px;
          height: 2px;
          background-color: var(--bc-gold-warm);
          margin-bottom: var(--bc-space-10);
        }
        .bc-bs-grid {
          display: grid;
          gap: var(--bc-space-12);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .bc-bs-grid {
            grid-template-columns: 5fr 7fr;
            align-items: start;
            gap: clamp(var(--bc-space-12), 6vw, var(--bc-space-20));
          }
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
        .bc-bs-headline {
          font-family: var(--font-playfair), serif;
          font-size: clamp(2.4rem, 4.5vw, 4.2rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--bc-text-primary);
        }
        .bc-bs-headline em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        .bc-bs-lead {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-base);
          line-height: 1.9;
          color: var(--bc-text-primary);
          margin-bottom: var(--bc-space-5);
          max-width: 60ch;
        }
        .bc-bs-body {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          line-height: 1.85;
          color: var(--bc-text-muted);
          max-width: 58ch;
          margin-bottom: var(--bc-space-10);
        }
        .bc-bs-stats {
          list-style: none;
          padding: 0;
          margin: 0 0 var(--bc-space-10);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--bc-space-6);
          padding-top: var(--bc-space-6);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-bs-stat {
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-1);
        }
        .bc-bs-stat-value {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-xl);
          font-weight: 400;
          color: var(--bc-brand-mauve);
          line-height: 1;
        }
        .bc-bs-stat-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--bc-text-muted);
        }
        .bc-bs-cta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--bc-space-4);
        }
        .bc-bs-cta-primary {
          display: inline-flex;
          align-items: center;
          padding: var(--bc-space-3) var(--bc-space-8);
          background-color: var(--bc-text-primary);
          color: var(--bc-surface-ivory);
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          transition: background-color 200ms ease;
        }
        .bc-bs-cta-primary:hover,
        .bc-bs-cta-primary:focus-visible {
          background-color: var(--bc-brand-mauve);
        }
        .bc-bs-cta-secondary {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--bc-text-primary);
          gap: var(--bc-space-2);
          padding-bottom: 2px;
          border-bottom: 1px solid var(--bc-text-primary);
          transition: color 200ms ease, border-color 200ms ease;
        }
        .bc-bs-cta-secondary:hover,
        .bc-bs-cta-secondary:focus-visible {
          color: var(--bc-brand-mauve);
          border-color: var(--bc-brand-mauve);
        }
        .bc-bs-cta-secondary::after {
          content: '\2192';
          font-size: 1em;
        }

        @media (prefers-reduced-motion: reduce) {
          .bc-bs-cta-primary,
          .bc-bs-cta-secondary { transition: none; }
        }
      `}</style>
    </section>
  );
}
