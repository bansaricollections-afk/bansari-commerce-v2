'use client';

import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const featured = {
  title: 'Sarees',
  occasion: 'Wedding & Celebration',
  image: '/categories/sarees.png',
  alt: 'Model in embroidered silk saree — face, neck embroidery and pallu border visible',
  link: '/shop?category=sarees',
  objectPosition: 'center top',
};

const supporting = [
  {
    title: 'Kurta Sets', occasion: 'Contemporary Ease',
    image: '/categories/kurta.png',
    alt: 'Model in embroidered kurta set — yoke embroidery and sleeve detail',
    link: '/shop?category=kurta-sets', objectPosition: 'center 20%',
  },
  {
    title: 'Co-ord Sets', occasion: 'Modern Ease',
    image: '/categories/coords.png',
    alt: 'Model in co-ord set — full silhouette visible',
    link: '/shop?category=co-ord-sets', objectPosition: 'center center',
  },
  {
    title: 'Anarkali', occasion: 'Timeless Grace',
    image: '/categories/anarkali.png',
    alt: 'Model in Anarkali — flared silhouette visible',
    link: '/shop?category=anarkali', objectPosition: 'center top',
  },
  {
    title: 'Western Wear', occasion: 'Modern Silhouettes',
    image: '/categories/western-wear.png',
    alt: 'Model in western wear — full silhouette visible',
    link: '/shop?category=western-wear', objectPosition: 'center center',
  },
];

const closing = {
  title: 'Ethnic Glory',
  occasion: 'Heritage Craft',
  image: '/categories/ethnic-glory.png',
  alt: 'Model in ethnic ensemble — border embroidery and heritage detail visible',
  link: '/shop?category=ethnic-glory',
  objectPosition: 'center 30%',
};

function TileLabel({
  title,
  occasion,
  cta = true,
}: {
  title: string;
  occasion: string;
  cta?: boolean;
}) {
  return (
    <div className="bc-cat__label">
      <span className="bc-cat__occasion">{occasion}</span>
      <span className="bc-cat__title">{title}</span>
      {cta && (
        <span className="bc-cat__discover">
          Discover
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  );
}

function ImageTile({
  title, occasion, image, alt, link, objectPosition,
  priority = false, className = '', sizes = '50vw', cta = true,
}: {
  title: string; occasion: string; image: string; alt: string;
  link: string; objectPosition: string; priority?: boolean;
  className?: string; sizes?: string; cta?: boolean;
}) {
  return (
    <Link
      href={link}
      aria-label={`Shop ${title} — ${occasion}`}
      className={`bc-cat__tile${className ? ` ${className}` : ''}`}
    >
      <div className="bc-cat__zoom">
        <ImageWithFallback
          src={image} alt={alt} fill sizes={sizes} priority={priority}
          className="bc-cat__img" style={{ objectPosition }}
        />
      </div>
      <TileLabel title={title} occasion={occasion} cta={cta} />
    </Link>
  );
}

export default function CategoryGrid() {
  return (
    <section aria-label="Shop The Edit — curated category discovery" className="bc-cat">
      <div className="bc-cat__inner">
        {/* Section heading */}
        <div className="bc-cat__header">
          <p className="bc-cat__kicker">The Edit</p>
          <h2 className="bc-cat__heading">Shop By Category</h2>
          <p className="bc-cat__sub">Six carefully curated worlds. Each one distinct, each one yours.</p>
        </div>

        {/* Main grid */}
        <div className="bc-cat__grid">
          <ImageTile
            {...featured}
            priority
            sizes="(min-width: 768px) 60vw, 100vw"
            className="bc-cat__featured"
          />
          <div className="bc-cat__supporting">
            {supporting.map(cat => (
              <ImageTile
                key={cat.title}
                {...cat}
                sizes="(min-width: 768px) 20vw, 50vw"
                className="bc-cat__support-tile"
              />
            ))}
          </div>
        </div>

        {/* Closing editorial band */}
        <div className="bc-cat__closing">
          <div className="bc-cat__closing-text">
            <p className="bc-cat__kicker">{closing.occasion}</p>
            <h3 className="bc-cat__closing-title">{closing.title}</h3>
            <p className="bc-cat__closing-body">
              Craftsmanship rooted in tradition. Each piece honours the artisans
              behind every stitch.
            </p>
            <Link href={closing.link} className="bc-cat__closing-cta">
              Discover the Collection
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <div className="bc-cat__closing-image">
            <div className="bc-cat__zoom">
              <ImageWithFallback
                src={closing.image} alt={closing.alt} fill
                sizes="(min-width: 768px) 66vw, 100vw"
                className="bc-cat__img"
                style={{ objectPosition: closing.objectPosition }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .bc-cat {
          background-color: var(--bc-surface-warm);
          padding-block: var(--bc-section-padding);
        }
        .bc-cat__inner {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc-cat__header {
          margin-bottom: var(--bc-space-10);
          border-bottom: 1px solid var(--bc-border-soft);
          padding-bottom: var(--bc-space-7);
        }
        .bc-cat__kicker {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-cat__heading {
          font-family: var(--font-playfair), serif;
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 400;
          color: var(--bc-text-primary);
          line-height: 1.1;
          letter-spacing: -0.015em;
          margin-bottom: var(--bc-space-2);
        }
        .bc-cat__sub {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-muted);
          line-height: 1.7;
          max-width: 44ch;
        }

        .bc-cat__grid {
          display: grid;
          gap: 1px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .bc-cat__grid { grid-template-columns: 3fr 2fr; }
        }
        .bc-cat__featured { min-height: 440px; }
        @media (min-width: 768px) { .bc-cat__featured { min-height: 680px; } }

        .bc-cat__supporting {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
        }
        .bc-cat__support-tile { min-height: 210px; }
        @media (min-width: 768px) { .bc-cat__support-tile { min-height: 338px; } }

        .bc-cat__tile {
          position: relative;
          display: block;
          overflow: hidden;
          cursor: pointer;
        }
        .bc-cat__zoom {
          height: 100%;
          width: 100%;
          transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .bc-cat__tile:hover .bc-cat__zoom { transform: scale(1.032); }
        .bc-cat__img { object-fit: cover; }

        .bc-cat__label {
          position: absolute;
          inset-x: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 3.5rem 1.375rem 1.375rem;
          background: linear-gradient(
            to top,
            rgba(22, 10, 18, 0.82) 0%,
            rgba(22, 10, 18, 0.28) 55%,
            transparent 100%
          );
          transition: padding-bottom 300ms ease;
        }
        .bc-cat__tile:hover .bc-cat__label { padding-bottom: 1.75rem; }
        .bc-cat__occasion {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.6rem;
          color: var(--bc-text-gold);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          display: block;
        }
        .bc-cat__title {
          font-family: var(--font-playfair), serif;
          font-size: clamp(1.1rem, 1.8vw, 1.5rem);
          color: #fff;
          font-weight: 500;
          line-height: 1.15;
          display: block;
        }
        .bc-cat__discover {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.72);
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          margin-top: 0.125rem;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 300ms ease, transform 300ms ease;
        }
        .bc-cat__tile:hover .bc-cat__discover { opacity: 1; transform: translateY(0); }

        .bc-cat__closing {
          display: grid;
          grid-template-columns: 1fr;
          margin-top: 1px;
          background-color: var(--bc-surface-cream);
          border-top: 1px solid var(--bc-border-soft);
        }
        @media (min-width: 768px) {
          .bc-cat__closing { grid-template-columns: 1fr 2fr; align-items: center; }
        }
        .bc-cat__closing-text {
          padding: var(--bc-space-12) var(--bc-space-8);
          display: flex;
          flex-direction: column;
        }
        .bc-cat__closing-title {
          font-family: var(--font-playfair), serif;
          font-size: clamp(1.5rem, 2.5vw, 2.25rem);
          font-weight: 400;
          color: var(--bc-text-primary);
          line-height: 1.12;
          letter-spacing: -0.01em;
          margin-bottom: var(--bc-space-4);
          margin-top: var(--bc-space-2);
        }
        .bc-cat__closing-body {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-muted);
          max-width: 30ch;
          line-height: 1.8;
          margin-bottom: var(--bc-space-6);
        }
        .bc-cat__closing-cta {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-text-secondary);
          border-bottom: 1px solid var(--bc-border-gold);
          padding-bottom: 3px;
          display: inline-flex;
          align-items: center;
          gap: var(--bc-space-2);
          width: fit-content;
          text-decoration: none;
          transition: color 200ms ease, border-color 200ms ease, gap 200ms ease;
        }
        .bc-cat__closing-cta:hover {
          color: var(--bc-brand-mauve);
          border-color: var(--bc-brand-mauve);
          gap: 0.625rem;
        }
        .bc-cat__closing-image {
          position: relative;
          overflow: hidden;
          height: clamp(280px, 38vw, 500px);
        }
      `}</style>
    </section>
  );
}
