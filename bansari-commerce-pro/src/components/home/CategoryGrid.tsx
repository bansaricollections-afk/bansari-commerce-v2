"use client";

import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

// ── Normalized filenames: no spaces, no uppercase, no fragile paths ──────────
const categories = [
  {
    id: 'sarees',
    label: 'Sarees',
    href: '/shop?category=sarees',
    image: '/categories/sarees.png',
    alt: 'Sarees — silk, cotton, georgette and more',
    span: 'large',
  },
  {
    id: 'suits',
    label: 'Suits & Sets',
    href: '/shop?category=suits',
    image: '/categories/suits.png',
    alt: 'Suits and sets — salwar, anarkali and pant suits',
    span: 'normal',
  },
  {
    id: 'kurtis',
    label: 'Kurtis',
    href: '/shop?category=kurtis',
    image: '/categories/kurtis.png',
    alt: 'Kurtis — casual, festive and work kurtis',
    span: 'normal',
  },
  {
    id: 'lehengas',
    label: 'Lehengas',
    href: '/shop?category=lehengas',
    image: '/categories/lehengas.png',
    alt: 'Lehengas — bridal and occasion lehenga cholis',
    span: 'normal',
  },
  {
    id: 'western-wear',
    label: 'Western Wear',
    href: '/shop?category=western-wear',
    // Previously: 'western wear.png' — spaces removed, lowercase enforced
    image: '/categories/western-wear.png',
    alt: 'Western wear — indo-western fusion outfits',
    span: 'normal',
  },
  {
    id: 'ethnic-glory',
    label: 'Ethnic Glory',
    href: '/shop?category=ethnic-glory',
    // Previously: 'Ethnic Glory.png' — spaces removed, lowercase enforced
    image: '/categories/ethnic-glory.png',
    alt: 'Ethnic glory — premium ethnic collection',
    span: 'large',
  },
];

export default function CategoryGrid() {
  return (
    <section
      aria-label="Shop by category"
      style={{
        backgroundColor: 'var(--bc-surface-cream)',
        paddingBlock: 'var(--bc-section-padding)',
        borderTop: '1px solid var(--bc-border-soft)',
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 'var(--bc-content-wide)',
          paddingInline: 'var(--bc-gutter)',
        }}
      >
        <div style={{ marginBottom: 'var(--bc-space-10)' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 'var(--bc-text-xs)',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--bc-text-gold)',
              marginBottom: 'var(--bc-space-2)',
            }}
          >
            The Collection
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 'var(--bc-text-2xl)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: 'var(--bc-text-primary)',
            }}
          >
            Shop By Category
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--bc-space-3)',
          }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                gridColumn: cat.span === 'large' ? 'span 2' : 'span 1',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: cat.span === 'large' ? '16/9' : '3/4',
                  overflow: 'hidden',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bc-surface-offset)',
                }}
              >
                <ImageWithFallback
                  src={cat.image}
                  alt={cat.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  style={{ objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'var(--bc-space-4)',
                    left: 'var(--bc-space-4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-playfair), serif',
                      fontSize: 'var(--bc-text-lg)',
                      fontWeight: 400,
                      color: '#fff',
                      lineHeight: 1.2,
                    }}
                  >
                    {cat.label}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
