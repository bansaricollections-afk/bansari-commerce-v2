/**
 * ShopByOccasion — Server Component
 * Luxury editorial occasion grid.
 * Benchmark: Pernia's Pop-Up Shop, Aza Fashions occasion landing.
 *
 * Desktop: 2-col asymmetric — large editorial tile left (Wedding),
 *          3 portrait tiles stacked right (Festive / Office / Party)
 * Tablet:  2×2 equal grid
 * Mobile:  single-column full-bleed stack
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const occasions = [
  {
    title: 'Wedding',
    eyebrow: 'Bridal & Celebrations',
    subtitle: 'Couture crafted for the most cherished moments.',
    image: '/occasions/wedding.jpg',
    href: '/shop?occasion=wedding',
    featured: true,
  },
  {
    title: 'Festive',
    eyebrow: 'Heritage Celebrations',
    subtitle: 'Traditional elegance for every festival.',
    image: '/occasions/festive.jpg',
    href: '/shop?occasion=festive',
    featured: false,
  },
  {
    title: 'Office',
    eyebrow: 'Contemporary Workwear',
    subtitle: 'Refined ethnic ease, nine to five.',
    image: '/occasions/office.jpg',
    href: '/shop?occasion=office',
    featured: false,
  },
  {
    title: 'Party',
    eyebrow: 'Evening Wear',
    subtitle: 'Make every entrance unforgettable.',
    image: '/occasions/party.jpg',
    href: '/shop?occasion=party',
    featured: false,
  },
] as const;

export default function ShopByOccasion() {
  const [featured, ...supporting] = occasions;

  return (
    <section aria-label="Shop by Occasion" className="bc-occ-section">
      {/* ── Section header ── */}
      <div className="bc-occ-container">
        <div className="bc-occ-header">
          <p className="bc-occ-eyebrow">The Occasion Edit</p>
          <h2 className="bc-occ-title">
            Dressed for <em className="bc-occ-title-em">every chapter.</em>
          </h2>
        </div>

        {/* ── Asymmetric grid ── */}
        <div className="bc-occ-grid" role="list">

          {/* Large featured tile — Wedding */}
          <Link
            href={featured.href}
            aria-label={`Shop ${featured.title} — ${featured.eyebrow}`}
            className="bc-occ-tile bc-occ-tile--featured"
            role="listitem"
          >
            <div className="bc-occ-img-wrap">
              <ImageWithFallback
                src={featured.image}
                alt={`${featured.title} — ${featured.eyebrow}`}
                fill
                priority
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 55vw"
                className="bc-occ-img"
              />
            </div>
            <div className="bc-occ-overlay" />
            <div className="bc-occ-label bc-occ-label--lg">
              <span className="bc-occ-label-eyebrow">{featured.eyebrow}</span>
              <span className="bc-occ-label-title">{featured.title}</span>
              <span className="bc-occ-label-subtitle">{featured.subtitle}</span>
              <span className="bc-occ-cta">Explore Edit &rarr;</span>
            </div>
          </Link>

          {/* Supporting 3 tiles — stacked column */}
          <div className="bc-occ-col" role="list">
            {supporting.map((occ) => (
              <Link
                key={occ.title}
                href={occ.href}
                aria-label={`Shop ${occ.title} — ${occ.eyebrow}`}
                className="bc-occ-tile bc-occ-tile--sm"
                role="listitem"
              >
                <div className="bc-occ-img-wrap">
                  <ImageWithFallback
                    src={occ.image}
                    alt={`${occ.title} — ${occ.eyebrow}`}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
                    className="bc-occ-img"
                  />
                </div>
                <div className="bc-occ-overlay" />
                <div className="bc-occ-label">
                  <span className="bc-occ-label-eyebrow">{occ.eyebrow}</span>
                  <span className="bc-occ-label-title">{occ.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="bc-occ-footer">
          <Link href="/shop" className="bc-occ-viewall">
            View All Occasions &rarr;
          </Link>
        </div>
      </div>

      <style>{`
        .bc-occ-section {
          background-color: var(--bc-surface-warm);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-occ-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        /* Header */
        .bc-occ-header {
          margin-bottom: var(--bc-space-10);
          padding-bottom: var(--bc-space-6);
          border-bottom: 1px solid var(--bc-border-soft);
        }
        .bc-occ-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-occ-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
        }
        .bc-occ-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        /* Grid */
        .bc-occ-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2px;
        }
        @media (min-width: 768px) {
          .bc-occ-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1024px) {
          .bc-occ-grid {
            grid-template-columns: 55fr 45fr;
          }
        }
        /* Supporting column */
        .bc-occ-col {
          display: grid;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 2px;
        }
        /* Tiles */
        .bc-occ-tile {
          position: relative;
          display: block;
          overflow: hidden;
          background-color: var(--bc-surface-offset);
        }
        .bc-occ-tile--featured { min-height: clamp(320px, 60vw, 680px); }
        .bc-occ-tile--sm { min-height: clamp(120px, 16vw, 220px); }
        /* Image */
        .bc-occ-img-wrap {
          position: absolute;
          inset: 0;
          transition: transform 700ms cubic-bezier(0.16,1,0.3,1);
        }
        .bc-occ-tile:hover .bc-occ-img-wrap { transform: scale(1.03); }
        .bc-occ-img { object-fit: cover; object-position: center top; }
        /* Overlay gradient */
        .bc-occ-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(20,12,16,0.72) 0%,
            rgba(20,12,16,0.24) 50%,
            transparent 80%
          );
          pointer-events: none;
          z-index: 1;
        }
        /* Label */
        .bc-occ-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: var(--bc-space-5) var(--bc-space-6);
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-1);
          z-index: 2;
        }
        .bc-occ-label--lg {
          padding: var(--bc-space-8) var(--bc-space-8);
          gap: var(--bc-space-2);
        }
        .bc-occ-label-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--bc-gold-light);
          display: block;
        }
        .bc-occ-label-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-xl);
          font-weight: 400;
          color: var(--bc-text-inverse);
          line-height: 1.12;
          display: block;
        }
        .bc-occ-tile--sm .bc-occ-label-title {
          font-size: var(--bc-text-lg);
        }
        .bc-occ-label-subtitle {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-inverse);
          opacity: 0.72;
          max-width: 36ch;
          line-height: 1.5;
          display: block;
          margin-top: var(--bc-space-1);
        }
        .bc-occ-cta {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-gold-light);
          display: inline-block;
          margin-top: var(--bc-space-4);
          border-bottom: 1px solid rgba(196,149,42,0.4);
          padding-bottom: 2px;
          transition: border-color var(--bc-transition-fast);
        }
        .bc-occ-tile:hover .bc-occ-cta { border-color: var(--bc-gold-light); }
        /* Footer */
        .bc-occ-footer {
          margin-top: var(--bc-space-8);
          text-align: center;
        }
        .bc-occ-viewall {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-text-secondary);
          border-bottom: 1px solid var(--bc-border-default);
          padding-bottom: 2px;
          text-decoration: none;
          transition: color var(--bc-transition-fast), border-color var(--bc-transition-fast);
        }
        .bc-occ-viewall:hover {
          color: var(--bc-brand-mauve);
          border-color: var(--bc-brand-mauve);
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-occ-img-wrap { transition: none; }
          .bc-occ-tile:hover .bc-occ-img-wrap { transform: none; }
        }
      `}</style>
    </section>
  );
}
