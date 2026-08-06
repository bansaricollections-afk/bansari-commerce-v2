/**
 * CategoryGrid — Server Component
 * Luxury editorial category navigation.
 * Benchmark: Nykaa Fashion, Pernia's Pop-Up Shop.
 *
 * Desktop: 5-column equal grid.
 * Mobile: 2-column grid.
 * Interaction: CSS-only scale + overlay opacity on hover.
 * No "use client", no JS hover handlers.
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const categories: {
  title: string;
  occasion: string;
  image: string;
  alt: string;
  link: string;
  objectPosition: string;
}[] = [
  {
    title: 'Sarees',
    occasion: 'Wedding & Celebration',
    image: '/categories/sarees.png',
    alt: 'Bansari — model in embroidered silk saree with gold pallu border',
    link: '/shop?category=sarees',
    objectPosition: 'center top',
  },
  {
    title: 'Kurta Sets',
    occasion: 'Contemporary Ease',
    image: '/categories/kurta.png',
    alt: 'Bansari — model in embroidered kurta set with yoke detail',
    link: '/shop?category=kurta-sets',
    objectPosition: 'center 20%',
  },
  {
    title: 'Co-ord Sets',
    occasion: 'Modern Ease',
    image: '/categories/coords.png',
    alt: 'Bansari — model in co-ord set, full silhouette',
    link: '/shop?category=co-ord-sets',
    objectPosition: 'center center',
  },
  {
    title: 'Anarkali',
    occasion: 'Timeless Grace',
    image: '/categories/anarkali.png',
    alt: 'Bansari — model in Anarkali with flared silhouette and neck embroidery',
    link: '/shop?category=anarkali',
    objectPosition: 'center top',
  },
  {
    title: 'Western Wear',
    occasion: 'Modern Silhouettes',
    image: '/categories/western-wear.png',
    alt: 'Bansari — model in contemporary western silhouette',
    link: '/shop?category=western-wear',
    objectPosition: 'center 20%',
  },
];

export default function CategoryGrid() {
  return (
    <section aria-label="Shop By Category" className="bc-cg-section">
      <div className="bc-cg-container">
        <div className="bc-cg-header">
          <p className="bc-cg-eyebrow">Curated For You</p>
          <h2 className="bc-cg-title">
            Shop By <em className="bc-cg-title-em">Category</em>
          </h2>
        </div>

        <ul role="list" className="bc-cg-grid">
          {categories.map((cat, index) => (
            <li key={cat.title} className="bc-cg-tile">
              <Link
                href={cat.link}
                aria-label={`Shop ${cat.title} — ${cat.occasion}`}
                className="bc-cg-link"
              >
                <div className="bc-cg-img-wrap">
                  <ImageWithFallback
                    src={cat.image}
                    alt={cat.alt}
                    fill
                    priority={index < 2}
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw"
                    className="bc-cg-img"
                    style={{ objectPosition: cat.objectPosition }}
                  />
                  <div className="bc-cg-gradient" aria-hidden="true" />
                </div>
                <div className="bc-cg-copy">
                  <span className="bc-cg-occasion">{cat.occasion}</span>
                  <h3 className="bc-cg-card-title">{cat.title}</h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .bc-cg-section {
          background-color: var(--bc-surface-cream);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-cg-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc-cg-header {
          margin-bottom: var(--bc-space-10);
        }
        .bc-cg-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-cg-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
        }
        .bc-cg-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }

        /* GRID */
        .bc-cg-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 1px;
          background-color: var(--bc-border-soft);
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) {
          .bc-cg-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .bc-cg-grid { grid-template-columns: repeat(5, 1fr); }
        }

        /* TILE */
        .bc-cg-tile {
          background-color: var(--bc-surface-cream);
          overflow: hidden;
        }
        .bc-cg-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }

        /* IMAGE */
        .bc-cg-img-wrap {
          position: relative;
          overflow: hidden;
          height: clamp(220px, 35vw, 400px);
        }
        @media (min-width: 1024px) {
          .bc-cg-img-wrap { height: clamp(260px, 24vw, 440px); }
        }
        .bc-cg-img {
          object-fit: cover;
          transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bc-cg-link:hover .bc-cg-img,
        .bc-cg-link:focus-visible .bc-cg-img {
          transform: scale(1.05);
        }
        .bc-cg-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            oklch(0.10 0.02 340 / 0.72) 0%,
            transparent 55%
          );
          pointer-events: none;
        }

        /* COPY */
        .bc-cg-copy {
          padding: var(--bc-space-4) var(--bc-space-4) var(--bc-space-5);
          background-color: var(--bc-surface-cream);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-cg-occasion {
          display: block;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-text-muted);
          margin-bottom: var(--bc-space-1);
        }
        .bc-cg-card-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-lg);
          font-weight: 400;
          color: var(--bc-text-primary);
          letter-spacing: -0.01em;
          line-height: 1.2;
        }
        .bc-cg-link:hover .bc-cg-card-title,
        .bc-cg-link:focus-visible .bc-cg-card-title {
          color: var(--bc-brand-mauve);
          transition: color 200ms ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .bc-cg-img { transition: none; }
        }
      `}</style>
    </section>
  );
}
