/**
 * WhyChooseUs — LUXURY EDITORIAL PROMISE BAND v3
 * Benchmark: Massimo Dutti editorial / COS typographic restraint
 *
 * Server Component — zero client JS.
 * All token references use defined bc- tokens (bc-transition-fast, not bc-transition-base).
 * Opacity levels meet WCAG AA at --bc-surface-dark background.
 */
import Link from 'next/link';

const promises = [
  {
    numeral: '01',
    label: 'Handpicked Designs',
    detail: 'Every piece curated for timeless elegance and the modern Indian woman.',
  },
  {
    numeral: '02',
    label: 'Premium Craftsmanship',
    detail: 'Fine fabrics, hand embroidery and meticulous quality finishing throughout.',
  },
  {
    numeral: '03',
    label: 'Trusted Shopping',
    detail: 'Secure payments, transparent policies and responsive customer support.',
  },
  {
    numeral: '04',
    label: 'Careful Delivery',
    detail: 'Reliable PAN India shipping with beautiful packaging in every order.',
  },
] as const;

export default function WhyChooseUs() {
  return (
    <section
      aria-label="The Bansari Promise"
      className="bc-wcu-section"
    >
      <div className="bc-wcu-grid">

        {/* ── LEFT: numeral promise list ── */}
        <div className="bc-wcu-left">
          <ol aria-label="Our commitments" className="bc-wcu-list">
            {promises.map(({ numeral, label, detail }, i) => (
              <li
                key={numeral}
                className="bc-wcu-item"
                style={{
                  paddingBottom: i === promises.length - 1 ? 0 : 'var(--bc-space-5)',
                }}
              >
                <span className="bc-wcu-numeral" aria-hidden="true">{numeral}</span>
                <div>
                  <p className="bc-wcu-label">{label}</p>
                  <p className="bc-wcu-detail">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── RIGHT: editorial statement ── */}
        <div className="bc-wcu-right">
          <p className="bc-wcu-eyebrow">The Bansari Promise</p>

          <h2 className="bc-wcu-title">
            Every piece is a quiet
            <br />
            <em className="bc-wcu-title-em">act of care.</em>
          </h2>

          <p className="bc-wcu-body">
            We founded Bansari Collections with a single conviction — that
            Indian ethnic wear deserves the same reverence as any luxury
            fashion house. Every fabric, every embroidery detail, every
            delivery is treated as an extension of that belief.
          </p>

          <Link href="/about" className="bc-wcu-cta">
            Our story &rarr;
          </Link>
        </div>
      </div>

      <style>{`
        .bc-wcu-section {
          background-color: var(--bc-surface-dark);
          padding-block: var(--bc-section-padding);
        }
        .bc-wcu-grid {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
          display: grid;
          gap: var(--bc-space-16);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .bc-wcu-grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--bc-space-24);
            align-items: start;
          }
        }
        /* List */
        .bc-wcu-list { list-style: none; margin: 0; padding: 0; }
        .bc-wcu-item {
          border-top: 1px solid var(--bc-border-dark);
          padding-top: var(--bc-space-5);
          display: grid;
          grid-template-columns: 3rem 1fr;
          gap: var(--bc-space-5);
          align-items: start;
        }
        .bc-wcu-numeral {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-sm);
          font-weight: 400;
          color: var(--bc-text-gold);
          letter-spacing: 0.06em;
          padding-top: 0.15em;
        }
        .bc-wcu-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bc-text-inverse);
          margin-bottom: var(--bc-space-1);
          opacity: 0.9;
        }
        .bc-wcu-detail {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-inverse);
          opacity: 0.55;
          line-height: 1.7;
          max-width: 32ch;
        }
        /* Right column */
        .bc-wcu-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-5);
        }
        .bc-wcu-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: var(--bc-text-inverse);
          margin-bottom: var(--bc-space-8);
        }
        .bc-wcu-title-em { font-style: italic; }
        .bc-wcu-body {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-base);
          line-height: 1.8;
          color: var(--bc-text-inverse);
          opacity: 0.62;
          max-width: 44ch;
          margin-bottom: var(--bc-space-10);
        }
        .bc-wcu-cta {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          border-bottom: 1px solid var(--bc-gold-dark);
          padding-bottom: 2px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: var(--bc-space-1);
          transition: opacity var(--bc-transition-fast);
        }
        .bc-wcu-cta:hover { opacity: 0.75; }
        @media (min-width: 1024px) {
          .bc-wcu-right {
            position: sticky;
            top: calc(var(--bc-announcement-h, 0px) + 5rem);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-wcu-cta { transition: none; }
        }
      `}</style>
    </section>
  );
}
