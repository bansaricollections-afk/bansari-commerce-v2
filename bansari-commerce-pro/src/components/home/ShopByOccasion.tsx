import Image from 'next/image';
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

const occasions = [
  {
    id: 'wedding',
    label: 'Wedding',
    href: '/shop?occasion=wedding',
    image: '/occasions/wedding.png',
    alt: 'Wedding ethnic wear — bridal and guest outfits',
  },
  {
    id: 'festive',
    label: 'Festive',
    href: '/shop?occasion=festive',
    image: '/occasions/festive.png',
    alt: 'Festive wear — Diwali, Navratri and celebration outfits',
  },
  {
    id: 'office',
    label: 'Office',
    href: '/shop?occasion=office',
    image: '/occasions/office.png',
    alt: 'Office ethnic wear — workwear kurtas and suits',
  },
  {
    id: 'party',
    label: 'Party',
    href: '/shop?occasion=party',
    image: '/occasions/party.png',
    alt: 'Party wear — evening and cocktail ethnic outfits',
  },
];

export default function ShopByOccasion() {
  return (
    <section
      aria-label="Shop by occasion"
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
        <div
          style={{
            marginBottom: 'var(--bc-space-10)',
          }}
        >
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
            Dress The Occasion
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
            Shop By Occasion
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--bc-space-4)',
          }}
        >
          {occasions.map((occ) => (
            <Link
              key={occ.id}
              href={occ.href}
              style={{ display: 'block', textDecoration: 'none' }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '3/4',
                  overflow: 'hidden',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bc-surface-offset)',
                }}
              >
                <ImageWithFallback
                  src={occ.image}
                  alt={occ.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
                  style={{ objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)',
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
                    {occ.label}
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
