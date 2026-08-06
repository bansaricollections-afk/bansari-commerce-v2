/**
 * AsWorn — Server Component
 * Editorial "As Worn" gallery linking to the brand's Instagram profile.
 * Does NOT claim to be a live Instagram feed.
 * CSS-only hover. Zero JS. Zero hydration cost.
 *
 * Replace Unsplash images with actual Bansari editorial photography
 * by updating the `gallery` array with Supabase Storage URLs.
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const INSTAGRAM_URL = 'https://instagram.com/bansari_collections';
const INSTAGRAM_HANDLE = '@bansari_collections';

const gallery = [
  {
    src: '/images/editorial/asworn-1.jpg',
    alt: 'Bansari Collections — crimson silk saree with gold zari border',
  },
  {
    src: '/images/editorial/asworn-2.jpg',
    alt: 'Bansari Collections — ivory embroidered kurta set',
  },
  {
    src: '/images/editorial/asworn-3.jpg',
    alt: 'Bansari Collections — rose anarkali gown for festive occasion',
  },
  {
    src: '/images/editorial/asworn-4.jpg',
    alt: 'Bansari Collections — teal chanderi co-ord set',
  },
  {
    src: '/images/editorial/asworn-5.jpg',
    alt: 'Bansari Collections — ivory and gold bridal lehenga',
  },
  {
    src: '/images/editorial/asworn-6.jpg',
    alt: 'Bansari Collections — midnight blue georgette saree',
  },
];

export default function InstagramGallery() {
  return (
    <section
      aria-label="As Worn — Bansari editorial gallery"
      className="bc-aw-section"
    >
      <div className="bc-aw-container">
        {/* Header */}
        <div className="bc-aw-header">
          <div>
            <p className="bc-aw-eyebrow">{INSTAGRAM_HANDLE}</p>
            <h2 className="bc-aw-title">As Worn</h2>
          </div>
          <Link
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Bansari Collections on Instagram"
            className="bc-aw-follow"
          >
            Follow on Instagram
          </Link>
        </div>

        {/* Grid */}
        <ul role="list" className="bc-aw-grid">
          {gallery.map(({ src, alt }, index) => (
            <li key={index} className="bc-aw-tile">
              <Link
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={alt}
                className="bc-aw-tile-link"
              >
                <ImageWithFallback
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 767px) 50vw, 33vw"
                  className="bc-aw-img"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .bc-aw-section {
          background-color: var(--bc-surface-cream);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-aw-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc-aw-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--bc-space-4);
          margin-bottom: var(--bc-space-10);
          padding-bottom: var(--bc-space-6);
          border-bottom: 1px solid var(--bc-border-soft);
        }
        .bc-aw-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-aw-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-xl);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--bc-text-primary);
        }
        .bc-aw-follow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bc-brand-mauve);
          border: 1px solid var(--bc-brand-mauve);
          padding: 0.625rem 1.5rem;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
          transition: background-color var(--bc-transition-base);
        }
        .bc-aw-follow:hover,
        .bc-aw-follow:focus-visible {
          background-color: var(--bc-brand-mauve-faint);
        }
        .bc-aw-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 1px;
          background-color: var(--bc-border-soft);
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 768px) {
          .bc-aw-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .bc-aw-tile {
          overflow: hidden;
          background-color: var(--bc-surface-cream);
        }
        .bc-aw-tile-link {
          display: block;
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }
        .bc-aw-img {
          object-fit: cover;
          transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bc-aw-tile-link:hover .bc-aw-img,
        .bc-aw-tile-link:focus-visible .bc-aw-img {
          transform: scale(1.04);
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-aw-img { transition: none; }
        }
      `}</style>
    </section>
  );
}
