'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';
import { logClientFetch, logClientFetchError } from '@/lib/debug/product-debug';

type Tab = 'new' | 'featured';

const SKELETON_COUNT = 4;

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback((tab: Tab) => {
    setLoading(true);
    const url = tab === 'new' ? '/api/products/new-arrivals' : '/api/products/featured';
    const t0 = performance.now();
    fetch(url, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data: Product[] }>;
      })
      .then(body => {
        const sliced = (body.data ?? []).slice(0, 4);
        let bytes = -1;
        try { bytes = new TextEncoder().encode(JSON.stringify(sliced)).length; } catch { /* noop */ }
        logClientFetch(url, sliced.length, performance.now() - t0, bytes);
        setProducts(sliced);
      })
      .catch((err: unknown) => { logClientFetchError(url, err); setProducts([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProducts(activeTab); }, [activeTab, fetchProducts]);

  const tabs: { key: Tab; label: string; sub: string }[] = [
    { key: 'new', label: 'New Collection', sub: 'Fresh arrivals this season' },
    { key: 'featured', label: 'Best Sellers', sub: 'The finest, considered and placed here' },
  ];

  return (
    <section aria-label="Featured products" className="bc-fp">
      <div className="bc-fp__inner">
        {/* Editorial header */}
        <div className="bc-fp__header">
          <p className="bc-fp__kicker">The House Edit</p>
          <div className="bc-fp__header-row">
            <div>
              <h2 className="bc-fp__heading">
                {activeTab === 'new' ? 'New Collection' : 'Best Sellers'}
              </h2>
              <p className="bc-fp__sub">
                {tabs.find(t => t.key === activeTab)?.sub}
              </p>
            </div>
            <Link href="/shop" className="bc-fp__view-all-desktop" aria-label="View all products">
              View All
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tab strip */}
        <div role="tablist" aria-label="Product collection tabs" className="bc-fp__tabs">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`bc-fp__tab${activeTab === key ? ' bc-fp__tab--active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="bc-fp__grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="bc-fp__skeleton" aria-hidden="true" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bc-fp__empty">
            <p className="bc-fp__empty-text">
              {activeTab === 'new' ? 'New arrivals coming soon.' : 'No featured products at the moment.'}
            </p>
            <Link href="/shop" className="bc-fp__empty-cta">Browse All &rarr;</Link>
          </div>
        ) : (
          <div className="bc-fp__grid">
            {products.map((product, idx) => (
              <ProductCard key={product.id} product={product} priority={idx === 0} />
            ))}
          </div>
        )}

        {/* View all — mobile footer */}
        {!loading && products.length > 0 && (
          <div className="bc-fp__footer">
            <Link href="/shop" className="bc-fp__view-all">
              View All Products
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      <style>{`
        .bc-fp {
          background-color: var(--bc-surface-cream);
          padding-block: var(--bc-section-padding);
          border-top: 1px solid var(--bc-border-soft);
        }
        .bc-fp__inner {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc-fp__header {
          margin-bottom: var(--bc-space-8);
          border-bottom: 1px solid var(--bc-border-soft);
          padding-bottom: var(--bc-space-6);
        }
        .bc-fp__kicker {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--bc-text-gold);
          margin-bottom: var(--bc-space-2);
        }
        .bc-fp__header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: var(--bc-space-4);
          flex-wrap: wrap;
        }
        .bc-fp__heading {
          font-family: var(--font-playfair), serif;
          font-size: clamp(1.6rem, 2.8vw, 2.4rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: var(--bc-text-primary);
          margin-bottom: var(--bc-space-1);
        }
        .bc-fp__sub {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          color: var(--bc-text-muted);
          line-height: 1.7;
        }
        .bc-fp__view-all-desktop {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--bc-text-secondary);
          border-bottom: 1px solid var(--bc-border-gold);
          padding-bottom: 2px;
          display: none;
          align-items: center;
          gap: var(--bc-space-1);
          text-decoration: none;
          white-space: nowrap;
          transition: color 200ms ease, gap 200ms ease;
          flex-shrink: 0;
        }
        @media (min-width: 768px) { .bc-fp__view-all-de