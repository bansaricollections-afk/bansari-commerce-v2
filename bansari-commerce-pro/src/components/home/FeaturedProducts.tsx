import Link from "next/link";

import ProductCard from "@/components/product/ProductCard";
import { getFeaturedProducts } from "@/services/product.service";

export default async function FeaturedProducts() {
  const featuredProducts = (await getFeaturedProducts()).slice(0, 4);

  return (
    <section
      aria-label="The House Edit — featured products"
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

        {/* ── Editorial header — left-aligned ── */}
        <div
          style={{
            marginBottom: "var(--bc-space-16)",
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
            New Arrivals
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
            The House Edit
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
            The finest of the season, considered and placed here.
          </p>
        </div>

        {/* ── Product rail ── */}
        {featuredProducts.length > 0 ? (
          <div
            className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-4"
          >
            {featuredProducts.map((product, index) => (
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
              The edit is being prepared.
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
              href="/shop"
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
            href="/shop"
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
            View the full edit →
          </Link>
        </div>

      </div>
    </section>
  );
}
