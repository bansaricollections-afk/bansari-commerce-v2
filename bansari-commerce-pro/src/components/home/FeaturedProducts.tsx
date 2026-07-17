"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import ProductCard from "@/components/product/ProductCard";
import { getNewArrivals, getFeaturedProducts } from "@/services/product.service";

/* ---------------------------------------------------------------
   TABS: New Collection | Best Sellers
   - New Collection = getNewArrivals() (is_new = true, ordered by created_at desc)
   - Best Sellers   = getFeaturedProducts() (is_featured = true)
   - Both fall back gracefully with an empty state + link to /shop
--------------------------------------------------------------- */

type Tab = "new" | "featured";

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getFeaturedProducts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = activeTab === "new" ? getNewArrivals : getFeaturedProducts;
    fetcher()
      .then((data) => setProducts(data.slice(0, 4)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "new", label: "New Collection" },
    { key: "featured", label: "Best Sellers" },
  ];

  return (
    <section
      aria-label="Featured products"
      style={{
        backgroundColor: "var(--bc-surface-cream)",
        paddingBlock: "var(--bc-section-padding)",
        borderTop: "1px solid var(--bc-border-soft)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        {/* ── Editorial header ── */}
        <div
          style={{
            marginBottom: "var(--bc-space-10)",
            borderBottom: "1px solid var(--bc-border-soft)",
            paddingBottom: "var(--bc-space-6)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-3)",
            }}
          >
            The House Edit
          </p>
          <h2
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "var(--bc-text-2xl)",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              color: "var(--bc-text-primary)",
              marginBottom: "var(--bc-space-3)",
            }}
          >
            {activeTab === "new" ? "New Collection" : "Best Sellers"}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-sm)",
              color: "var(--bc-text-muted)",
              lineHeight: 1.7,
              maxWidth: "48ch",
            }}
          >
            {activeTab === "new"
              ? "Fresh arrivals — the latest pieces from our newest collection."
              : "The finest of the season, considered and placed here."}
          </p>
        </div>

        {/* ── Tab strip ── */}
        <div
          role="tablist"
          aria-label="Product collection tabs"
          style={{
            display: "flex",
            gap: "var(--bc-space-2)",
            marginBottom: "var(--bc-space-10)",
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "0.5rem 1.25rem",
                borderRadius: "var(--bc-radius-full)",
                border: activeTab === key
                  ? "1px solid var(--bc-brand-mauve)"
                  : "1px solid var(--bc-border-soft)",
                backgroundColor: activeTab === key
                  ? "var(--bc-brand-mauve)"
                  : "transparent",
                color: activeTab === key
                  ? "#fff"
                  : "var(--bc-text-muted)",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  style={{
                    backgroundColor: "var(--bc-border-soft)",
                    borderRadius: "var(--bc-radius-lg)",
                    aspectRatio: "3/4",
                    marginBottom: "var(--bc-space-4)",
                  }}
                />
                <div
                  style={{
                    height: "1rem",
                    width: "60%",
                    backgroundColor: "var(--bc-border-soft)",
                    borderRadius: "4px",
                    marginBottom: "var(--bc-space-2)",
                  }}
                />
                <div
                  style={{
                    height: "0.75rem",
                    width: "35%",
                    backgroundColor: "var(--bc-border-soft)",
                    borderRadius: "4px",
                  }}
                />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "var(--bc-space-20) 0",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: "var(--bc-text-xl)",
                fontWeight: 400,
                color: "var(--bc-text-primary)",
                marginBottom: "var(--bc-space-3)",
              }}
            >
              {activeTab === "new"
                ? "New arrivals are on their way."
                : "The edit is being prepared."}
            </p>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-sm)",
                color: "var(--bc-text-muted)",
                marginBottom: "var(--bc-space-8)",
              }}
            >
              New pieces will appear here shortly.
            </p>
            <Link
              href={activeTab === "new" ? "/new-arrivals" : "/shop"}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--bc-brand-mauve)",
                borderBottom: "1px solid var(--bc-border-gold)",
                paddingBottom: "2px",
              }}
            >
              Browse the full collection
            </Link>
          </div>
        )}

        {/* ── Footer link ── */}
        <div
          style={{
            marginTop: "var(--bc-space-16)",
            borderTop: "1px solid var(--bc-border-soft)",
            paddingTop: "var(--bc-space-6)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Link
            href={activeTab === "new" ? "/new-arrivals" : "/shop"}
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-text-secondary)",
              borderBottom: "1px solid var(--bc-border-gold)",
              paddingBottom: "2px",
              transition: "color var(--bc-transition-base)",
            }}
          >
            {activeTab === "new" ? "View all new arrivals →" : "View the full edit →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
