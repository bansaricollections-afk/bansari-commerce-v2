/**
 * ShopByOccasion — Server Component
 * Luxury editorial occasion grid.
 * Benchmark: Aza Fashions, Pernia's Pop-Up Shop.
 *
 * Desktop: asymmetric 2-column — 1 tall editorial hero tile (left)
 *          + 3 portrait tiles stacked/arranged (right).
 * Mobile: 2-column grid with natural aspect ratios.
 * Hover: CSS only (scale + overlay opacity). Zero JS.
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const occasions = [
  {
    title: 'Wedding',
    occasion: 'Bridal & Celebration',
    description: 'Lehengas, sarees and ceremonial sets for every ritual.',
    image: '/images/occasions/wedding.jpg',
    alt: 'Bansari — bridal lehenga in ivory and gold zari embroidery',
    href: '/shop?occasion=wedding',
    hero: true,
  },
  {
    title: 'Festive',
    occasion: 'Diwali & Navratri',
    description: 'Vibrant silks and embroidered anarkalis for the festival season.',
    image: '/images/occasions/festive.jpg',
    alt: 'Bansari — crimson silk saree with gold zari border',
    href: '/shop?occasion=festive',
    hero: false,
  },
  {
    title: 'Office',
    occasion: 'Everyday Elegance',
    description: 'Refined kurta sets and co-ords for the contemporary workplace.',
    image: '/images/occasions/office.jpg',
    alt: 'Bansari — ivory embroidered kurta set, office-wear',
    href: '/shop?occasion=office',
    hero: false,
  },
  {
    title: 'Evening',
    occasion: 'Soirees & Galas',
    description: 'Sculptured gowns and draped silhouettes for after-dark moments.',
    image: '/images/occasions/evening.jpg',
    alt: 'Bansari — midnight blue georgette draped gown',
    href: '/shop?occasion=evening',
    hero: false,
  },
];

export default function ShopByOccasion() {
  const heroOccasion = occasions[0];
  const supportingOccasions = occasions.slice(1);

  return (
    <section
      aria-label="Shop By Occasion"
      className="bc-sbo-section"
    >
      <div className="bc-sbo-container">
        {/* ── Section heading ── */}
        <div className="bc-sbo-header">
          <p className="bc-sbo-eyebrow">Dress For Every Chapter</p>
          <h2 className="bc-sbo-title">
            Shop By{' '}
            <em className="bc-sbo-title-em">Occasion</em>
          </h2>
          <p className="bc-sbo-subtitle">
            From bridal ceremonies to boardroom mornings — each silhouette
            considered for the moment it will inhabit.
          </p>
        </div>

        {/* ── Occasion grid ── */}
        <ul role="list" className="bc-sbo-grid">
          {/* Hero tile — tall, left column on desktop */}
          <li className="bc-sbo-tile bc-sbo-tile--hero">
            <Link
              href={heroOccasion.href}
              aria-label={`Shop ${heroOccasion.title} — ${heroOccasion.occasion}`}
              className="bc-sbo-link"
            >
              <div className="bc-sbo-img-wrap">
                <ImageWithFallback
                  src={heroOccasion.image}
                  alt={heroOccasion.alt}
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 40vw"
                  className="bc-sbo-img"
                />
                <div className="bc-sbo-gradient" aria-hidden="true" />
              </div>
              <div className="bc-sbo-copy">
                <span className="bc-sbo-occasion-label">{heroOccasion.occasion}</span>
                <h3 className="bc-sbo-card-title">{heroOccasion.title}</h3>
                <p className="bc-sbo-card-desc">{heroOccasion.description}</p>
                <span className="bc-sbo-cta" aria-hidden="true">Discover &rarr;</span>
              </div>
            </Link>
          </li>

          {/* Supporting tiles — 3-up on desktop right column */}
          {supportingOccasions.map((item) => (
            <li key={item.title} className="bc-sbo-tile bc-sbo-tile--support">
              <Link
                href={item.href}
                aria-label={`Shop ${item.title} — ${item.occasion}`}
                className="bc-sbo-link"
              >
                <div className="bc-sbo-img-wrap">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 30vw"
                    className="bc-sbo-img"
                  />
                  <div className="bc-sbo-gradient" aria-hidden="true" />
                </div>
                <div className="bc-sbo-copy">
                  <span className="bc-sbo-occasion-label">{item.occasion}</span>
                  <h3 className="bc-sbo-card-title">{item.title}</h3>
                  <span className="bc-sbo-cta" aria-hidden="true">Discover &rarr;</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        /* SECTION */
        .bc-sbo-section {
          background-color: var(--bc-surface-cream);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-sbo-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }

        /* HEADER */
        .bc-sbo-header {
          margin-bottom: var(--bc-space-12);
          padding-bottom: var(--bc-space-6);
          border-bottom: 1px solid var(--bc-border-soft);
          max-width: 56ch;
        }
        .bc-sbo-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-3);
        }
        .bc-sbo-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          margin-bottom: var(--bc-space-4);
        }
        .bc-sbo-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        .bc-sbo-subtitle {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-muted);
          line-height: 1.8;
          max-width: 52ch;
        }

        /* GRID */
        .bc-sbo-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 1px;
          background-color: var(--bc-border-soft);
          /* Mobile: 2 columns */
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto;
        }
        @media (min-width: 1024px) {
          .bc-sbo-grid {
            /* Desktop: hero tile spans 2 rows left, 3 tiles stack right */
            grid-template-columns: 5fr 7fr;
            grid-template-rows: 1fr 1fr;
          }
        }

        /* TILES */
        .bc-sbo-tile {
          background-color: var(--bc-surface-cream);
          overflow: hidden;
          position: relative;
        }
        .bc-sbo-tile--hero {
          /* Mobile: full width above support tiles */
          grid-column: 1 / -1;
        }
        @media (min-width: 1024px) {
          .bc-sbo-tile--hero {
            grid-column: 1 / 2;
            grid-row: 1 / 3;
          }
          .bc-sbo-tile--support {
            grid-column: 2 / 3;
          }
        }

        /* LINK — fills tile, no underline */
        .bc-sbo-link {
          display: block;
          position: relative;
          text-decoration: none;
          height: 100%;
          color: inherit;
        }

        /* IMAGE WRAPPER */
        .bc-sbo-img-wrap {
          position: relative;
          overflow: hidden;
          /* Hero mobile */
          height: clamp(320px, 60vw, 560px);
        }
        @media (min-width: 1024px) {
          .bc-sbo-tile--hero .bc-sbo-img-wrap {
            height: clamp(480px, 50vw, 720px);
          }
          .bc-sbo-tile--support .bc-sbo-img-wrap {
            height: clamp(200px, 22vw, 320px);
          }
        }

        /* IMAGE — CSS zoom on hover */
        .bc-sbo-img {
          object-fit: cover;
          transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bc-sbo-link:hover .bc-sbo-img,
        .bc-sbo-link:focus-visible .bc-sbo-img {
          transform: scale(1.04);
        }

        /* GRADIENT OVERLAY */
        .bc-sbo-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            oklch(0.12 0.02 340 / 0.82) 0%,
            oklch(0.12 0.02 340 / 0.28) 45%,
            transparent 72%
          );
          pointer-events: none;
          transition: opacity 400ms ease;
        }
        .bc-sbo-link:hover .bc-sbo-gradient,
        .bc-sbo-link:focus-visible .bc-sbo-gradient {
          opacity: 0.88;
        }

        /* COPY BLOCK — overlaid on image */
        .bc-sbo-copy {
          position: absolute;
          inset-x: 0;
          bottom: 0;
          padding: var(--bc-space-6) var(--bc-space-6) var(--bc-space-7);
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-1);
          z-index: 2;
        }
        .bc-sbo-occasion-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--bc-gold-warm);
        }
        .bc-sbo-card-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-xl);
          font-weight: 400;
          color: #fff;
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin: 0;
        }
        @media (min-width: 1024px) {
          .bc-sbo-tile--hero .bc-sbo-card-title {
            font-size: var(--bc-text-2xl);
          }
        }
        .bc-sbo-card-desc {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: rgba(255,255,255,0.78);
          line-height: 1.7;
          max-width: 36ch;
          margin-top: var(--bc-space-1);
          display: none;
        }
        @media (min-width: 1024px) {
          .bc-sbo-card-desc { display: block; }
        }
        .bc-sbo-cta {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.72);
          margin-top: var(--bc-space-2);
          transition: color 200ms ease;
        }
        .bc-sbo-link:hover .bc-sbo-cta,
        .bc-sbo-link:focus-visible .bc-sbo-cta {
          color: var(--bc-gold-warm);
        }

        @media (prefers-reduced-motion: reduce) {
          .bc-sbo-img { transition: none; }
          .bc-sbo-gradient { transition: none; }
        }
      `}</style>
    </section>
  );
}
