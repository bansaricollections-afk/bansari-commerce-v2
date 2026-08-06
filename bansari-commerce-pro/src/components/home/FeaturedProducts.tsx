/**
 * FeaturedProducts — client component (tab state).
 *
 * Tabs: New Collection | Best Sellers
 * Fetches from API routes (service-role key never in browser bundle).
 * Skeleton uses --bc-ar-product aspect-ratio token for zero CLS.
 * Shimmer keyframe is defined in globals.css (single source).
 */
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';
import {
  logClientFetch,
  logClientFetchError,
} from '@/lib/debug/product-debug';

type Tab = 'new' | 'featured';

/** Named export for the Suspense fallback used in page.tsx */
export function FeaturedProductsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading featured products"
      style={{
        backgroundColor: 'var(--bc-surface-cream)',
        paddingBlock: 'var(--bc-section-padding)',
        borderTop: '1px solid var(--bc-border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--bc-content-wide)',
          margin: '0 auto',
          paddingInline: 'var(--bc-gutter)',
        }}
      >
        {/* Header skeleton */}
        <div style={{ marginBottom: 'var(--bc-space-10)', paddingBottom: 'var(--bc-space-6)', borderBottom: '1px solid var(--bc-border-soft)' }}>
          <div style={{ height: '0.75rem', width: '6rem', backgroundColor: 'var(--bc-surface-offset)', borderRadius: '2px', marginBottom: 'var(--bc-space-3)', animation: 'bc-shimmer 1.4s ease-in-out infinite' }} />
          <div style={{ height: '2.5rem', width: '18rem', backgroundColor: 'var(--bc-surface-offset)', borderRadius: '2px', animation: 'bc-shimmer 1.4s ease-in-out infinite' }} />
        </div>
        {/* Product grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--bc-space-6)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{ aspectRatio: 'var(--bc-ar-product)', backgroundColor: 'var(--bc-surface-offset)', borderRadius: '2px', animation: 'bc-shimmer 1.4s ease-in-out infinite' }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url =
      activeTab === 'new'
        ? '/api/products/new-arrivals'
        : '/api/products/featured';

    const t0 = performance.now();

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data: Product[] }>;
      })
      .then((body) => {
        const sliced = (body.data ?? []).slice(0, 4);
        const elapsed = performance.now() - t0;
        let bytes = -1;
        try { bytes = new TextEncoder().encode(JSON.stringify(sliced)).length; } catch { /* noop */ }
        logClientFetch(url, sliced.length, elapsed, bytes);
        setProducts(sliced);
      })
      .catch((err: unknown) => {
        logClientFetchError(url, err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'new',      label: 'New Collection' },
    { key: 'featured', label: 'Best Sellers' },
  ];

  return (
    <section
      aria-label="Featured products"
      style={{
        backgroundColor: 'var(--bc-surface-cream)',
        paddingBlock: 'var(--bc-section-padding)',
        borderTop: '1px solid var(--bc-border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--bc-content-wide)',
          margin: '0 auto',
          paddingInline: 'var(--bc-gutter)',
        }}
      >
        {/* ── Editorial header ── */}
        <div
          style={{
            marginBottom: 'var(--bc-space-10)',
            borderBottom: '1px solid var(--bc-border-soft)',
            paddingBottom: 'var(--bc-space-6)',
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
              marginBottom: 'var(--bc-space-3)',
            }}
          >
            The House Edit
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 'var(--bc-text-2xl)',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--bc-text-primary)',
              marginBottom: 'var(--bc-space-3)',
            }}
          >
            {activeTab === 'new' ? 'New Collection' : 'Best Sellers'}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 'var(--bc-text-sm)',
              color: 'var(--bc-text-muted)',
              lineHeight: 1.7,
              maxWidth: '48ch',
            }}
          >
            {activeTab === 'new'
              ? 'Fresh arrivals — the latest pieces from our newest collection.'
              : 'The finest of the season, considered and placed here.'}
          </p>
        </div>

        {/* ── Tab strip ── */}
        <div
          role="tablist"
          aria-label="Product collection tabs"
          style={{ display: 'flex', gap: 'var(--bc-space-1)', marginBottom: 'var(--bc-space-8)' }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 'var(--bc-text-xs)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: 'var(--bc-space-2) var(--bc-space-4)',
                border: activeTab === key
                  ? '1px solid var(--bc-text-primary)'
                  : '1px solid var(--bc-border-soft)',
                backgroundColor: activeTab === key
                  ? 'var(--bc-text-primary)'
                  : 'transparent',
                color: activeTab === key
                  ? 'var(--bc-surface-cream)'
                  : 'var(--bc-text-muted)',
                cursor: 'pointer',
                transition: 'all 180ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--bc-space-4)' }}>
            <style>{`@media(min-width:768px){.bc-fp-skeleton-grid{grid-template-columns:repeat(4,1fr)!important;}}`}</style>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bc-fp-skeleton-item"
                style={{
                  aspectRatio: 'var(--bc-ar-product)',
                  backgroundColor: 'var(--bc-surface-offset)',
                  borderRadius: '2px',
                  animation: 'bc-shimmer 1.4s ease-in-out infinite',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--bc-space-16) var(--bc-space-8)',
              color: 'var(--bc-text-muted)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'var(--bc-text-sm)', marginBottom: 'var(--bc-space-4)' }}>
              {activeTab === 'new' ? 'New arrivals coming soon.' : 'No featured products at the moment.'}
            </p>
            <Link
              href="/shop"
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 'var(--bc-text-xs)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--bc-text-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
              }}
            >
              Browse All
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--bc-space-4)',
            }}
          >
            <style>{`@media(min-width:768px){.bc-fp-grid{grid-template-columns:repeat(4,1fr)!important;}}`}</style>
            {products.map((product, idx) => (
              <ProductCard key={product.id} product={product} priority={idx === 0} />
            ))}
          </div>
        )}

        {/* ── View All CTA ── */}
        {!loading && products.length > 0 && (
          <div style={{ marginTop: 'var(--bc-space-10)', textAlign: 'center' }}>
            <Link
              href="/shop"
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 'var(--bc-text-xs)',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--bc-text-primary)',
                borderBottom: '1px solid currentColor',
                paddingBottom: '2px',
                textDecoration: 'none',
              }}
            >
              View All &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
