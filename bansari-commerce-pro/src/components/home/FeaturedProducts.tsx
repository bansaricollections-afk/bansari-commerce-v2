/**
 * FeaturedProducts — Server Component
 *
 * Fetches directly from Supabase (server-side, no fetch round-trip).
 * Parent must wrap in <Suspense fallback={<FeaturedProductsSkeleton />}>
 *
 * Query: is_featured = true, status = 'active',
 *        order by sort_order ASC, created_at DESC, LIMIT 8.
 */
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { createClient } from '@/lib/supabase/server';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  category: string | null;
  images: string[] | null;
  is_new: boolean | null;
  is_bestseller: boolean | null;
}

export default async function FeaturedProducts() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, price, original_price, category, images, is_new, is_bestseller')
    .eq('is_featured', true)
    .eq('status', 'active')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !products?.length) return null;

  return (
    <section aria-label="Featured Products" className="bc-fp-section">
      <div className="bc-fp-container">
        <div className="bc-fp-header">
          <p className="bc-fp-eyebrow">Handpicked for the Season</p>
          <h2 className="bc-fp-title">
            Featured <em className="bc-fp-title-em">Pieces</em>
          </h2>
        </div>

        <ul role="list" className="bc-fp-grid">
          {products.map((product: ProductRow) => {
            const img = product.images?.[0] ?? '';
            const discount =
              product.original_price && product.original_price > product.price
                ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                : null;

            return (
              <li key={product.id} className="bc-fp-card">
                <Link
                  href={`/products/${product.slug}`}
                  aria-label={product.name}
                  className="bc-fp-card-link"
                >
                  <div className="bc-fp-img-wrap">
                    <ImageWithFallback
                      src={img}
                      alt={product.name}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                      className="bc-fp-img"
                    />
                    {/* Badges */}
                    <div className="bc-fp-badges" aria-hidden="true">
                      {product.is_new && <span className="bc-fp-badge bc-fp-badge--new">New</span>}
                      {product.is_bestseller && <span className="bc-fp-badge bc-fp-badge--best">Bestseller</span>}
                      {discount && <span className="bc-fp-badge bc-fp-badge--sale">{discount}% off</span>}
                    </div>
                  </div>

                  <div className="bc-fp-meta">
                    {product.category && (
                      <span className="bc-fp-category">{product.category}</span>
                    )}
                    <h3 className="bc-fp-name">{product.name}</h3>
                    <div className="bc-fp-pricing">
                      <span className="bc-fp-price">{INR.format(product.price)}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="bc-fp-original">{INR.format(product.original_price)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="bc-fp-footer">
          <Link href="/shop?filter=featured" className="bc-fp-view-all">
            View All Featured Pieces
          </Link>
        </div>
      </div>

      <style>{`
        .bc-fp-section {
          background-color: var(--bc-surface-ivory);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-fp-container {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc-fp-header {
          margin-bottom: var(--bc-space-10);
        }
        .bc-fp-eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-fp-title {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-2xl);
          font-weight: 400;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          line-height: 1.1;
        }
        .bc-fp-title-em {
          font-style: italic;
          color: var(--bc-brand-mauve);
        }
        .bc-fp-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 1px;
          background-color: var(--bc-border-soft);
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 768px) {
          .bc-fp-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1280px) {
          .bc-fp-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .bc-fp-card {
          background-color: var(--bc-surface-ivory);
          overflow: hidden;
        }
        .bc-fp-card-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .bc-fp-img-wrap {
          position: relative;
          overflow: hidden;
          aspect-ratio: 3/4;
        }
        .bc-fp-img {
          object-fit: cover;
          object-position: center top;
          transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bc-fp-card-link:hover .bc-fp-img,
        .bc-fp-card-link:focus-visible .bc-fp-img {
          transform: scale(1.04);
        }
        .bc-fp-badges {
          position: absolute;
          top: var(--bc-space-3);
          left: var(--bc-space-3);
          display: flex;
          flex-direction: column;
          gap: var(--bc-space-1);
          z-index: 2;
        }
        .bc-fp-badge {
          font-family: var(--font-inter), sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 3px 7px;
          line-height: 1.4;
        }
        .bc-fp-badge--new {
          background-color: var(--bc-text-primary);
          color: var(--bc-surface-ivory);
        }
        .bc-fp-badge--best {
          background-color: var(--bc-gold-warm);
          color: #fff;
        }
        .bc-fp-badge--sale {
          background-color: var(--bc-brand-mauve);
          color: #fff;
        }
        .bc-fp-meta {
          padding: var(--bc-space-4) var(--bc-space-4) var(--bc-space-5);
          background-color: var(--bc-surface-ivory);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-fp-category {
          display: block;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--bc-text-muted);
          margin-bottom: var(--bc-space-1);
        }
        .bc-fp-name {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-base);
          font-weight: 400;
          color: var(--bc-text-primary);
          line-height: 1.3;
          margin-bottom: var(--bc-space-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bc-fp-pricing {
          display: flex;
          align-items: center;
          gap: var(--bc-space-2);
        }
        .bc-fp-price {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          font-weight: 600;
          color: var(--bc-text-primary);
        }
        .bc-fp-original {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          color: var(--bc-text-muted);
          text-decoration: line-through;
        }
        .bc-fp-footer {
          margin-top: var(--bc-space-10);
          display: flex;
          justify-content: center;
        }
        .bc-fp-view-all {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--bc-text-primary);
          padding-bottom: 3px;
          border-bottom: 1px solid var(--bc-text-primary);
          transition: color 200ms ease, border-color 200ms ease;
        }
        .bc-fp-view-all:hover,
        .bc-fp-view-all:focus-visible {
          color: var(--bc-brand-mauve);
          border-color: var(--bc-brand-mauve);
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-fp-img { transition: none; }
        }
      `}</style>
    </section>
  );
}

/** Skeleton shown during Suspense. Mirror the grid layout. */
export function FeaturedProductsSkeleton() {
  return (
    <section aria-label="Featured Products loading" className="bc-fp-section">
      <div className="bc-fp-container">
        <div className="bc-fp-header">
          <div style={{ width: 120, height: 12, background: 'var(--bc-border-soft)', marginBottom: 10 }} />
          <div style={{ width: 240, height: 36, background: 'var(--bc-border-soft)' }} />
        </div>
        <div style={{
          display: 'grid',
          gap: 1,
          background: 'var(--bc-border-soft)',
          gridTemplateColumns: 'repeat(2, 1fr)',
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bc-surface-ivory)' }}>
              <div style={{ aspectRatio: '3/4', background: 'var(--bc-surface-cream)' }} />
              <div style={{ padding: '16px 16px 20px', borderTop: '1px solid var(--bc-border-soft)' }}>
                <div style={{ width: '60%', height: 10, background: 'var(--bc-border-soft)', marginBottom: 8 }} />
                <div style={{ width: '85%', height: 14, background: 'var(--bc-border-soft)', marginBottom: 10 }} />
                <div style={{ width: 64, height: 12, background: 'var(--bc-border-soft)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
