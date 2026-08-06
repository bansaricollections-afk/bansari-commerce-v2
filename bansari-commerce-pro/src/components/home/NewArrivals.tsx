"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: "NEW" | "SALE" | "EXCLUSIVE";
  image: string;
  hoverImage: string;
  href: string;
  colors: string[];
}

const NEW_ARRIVALS: Product[] = [
  {
    id: "na-1",
    name: "Gulabi Silk Anarkali",
    category: "Anarkali Sets",
    price: 4499,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop",
    href: "/product/gulabi-silk-anarkali",
    colors: ["#C4757A", "#4A3728", "#2C4A3A"],
  },
  {
    id: "na-2",
    name: "Ivory Chikankari Kurta Set",
    category: "Kurta Sets",
    price: 2899,
    originalPrice: 3500,
    badge: "SALE",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80&auto=format&fit=crop",
    href: "/product/ivory-chikankari-kurta",
    colors: ["#F5F0EA", "#C4757A", "#4A3728"],
  },
  {
    id: "na-3",
    name: "Zardozi Bridal Lehenga",
    category: "Bridal Lehengas",
    price: 18999,
    badge: "EXCLUSIVE",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop",
    href: "/product/zardozi-bridal-lehenga",
    colors: ["#8A1E3C", "#C9A96E", "#2C1A24"],
  },
  {
    id: "na-4",
    name: "Malmal Cotton Saree",
    category: "Sarees",
    price: 1899,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=600&q=80&auto=format&fit=crop",
    href: "/product/malmal-cotton-saree",
    colors: ["#C9A96E", "#4A3A3A", "#2C4A3A"],
  },
  {
    id: "na-5",
    name: "Phulkari Dupatta",
    category: "Dupattas",
    price: 999,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80&auto=format&fit=crop",
    href: "/product/phulkari-dupatta",
    colors: ["#E8A87C", "#4A3728", "#C4757A"],
  },
];

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  NEW:       { background: "var(--bc-brand-mauve)",    color: "#fff" },
  SALE:      { background: "#B91C1C",                  color: "#fff" },
  EXCLUSIVE: { background: "var(--bc-brand-plum)",     color: "var(--bc-gold-light)" },
};

export default function NewArrivals() {
  return (
    <section
      aria-labelledby="new-arrivals-heading"
      style={{
        background: "var(--bc-cream)",
        padding: "var(--bc-section) 0",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "0 var(--bc-gutter)", maxWidth: "var(--bc-wide)", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(2rem, 3.5vw, 3.5rem)",
            gap: "1.5rem",
          }}
        >
          <div>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--bc-gold-dark)",
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              <span style={{ display: "block", width: "2rem", height: "1px", background: "var(--bc-gold)" }} />
              Just Arrived
            </span>
            <h2
              id="new-arrivals-heading"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
                fontWeight: 500,
                color: "var(--bc-text-ink)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              New Arrivals
            </h2>
          </div>
          <Link
            href="/new-arrivals"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-brand-mauve)",
              fontWeight: 500,
              borderBottom: "1px solid var(--bc-brand-mauve)",
              paddingBottom: "0.125rem",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            View all
          </Link>
        </div>
      </div>

      {/* Product rail */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          paddingInline: "var(--bc-gutter)",
          overflowX: "auto",
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          maxWidth: "var(--bc-full)",
          marginInline: "auto",
        }}
      >
        {NEW_ARRIVALS.map(product => (
          <LuxuryProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function LuxuryProductCard({ product }: { product: Product }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <article
      style={{
        flexShrink: 0,
        width: "clamp(240px, 28vw, 320px)",
        scrollSnapAlign: "start",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          overflow: "hidden",
          background: "var(--bc-stone)",
          marginBottom: "1rem",
        }}
      >
        {/* Primary image */}
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 60vw, 28vw"
          style={{
            objectFit: "cover",
            transition: "opacity 500ms ease",
            opacity: hovered ? 0 : 1,
          }}
        />
        {/* Hover image */}
        <Image
          src={product.hoverImage}
          alt={`${product.name} alternate view`}
          fill
          sizes="(max-width: 640px) 60vw, 28vw"
          style={{
            objectFit: "cover",
            transition: "opacity 500ms ease",
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Badge */}
        {product.badge && (
          <span
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "0.25rem 0.625rem",
              zIndex: 2,
              ...BADGE_STYLES[product.badge],
            }}
          >
            {product.badge}
          </span>
        )}

        {/* Discount badge */}
        {discount && (
          <span
            style={{
              position: "absolute",
              top: product.badge ? "2.75rem" : "1rem",
              left: "1rem",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              background: "#B91C1C",
              color: "#fff",
              zIndex: 2,
            }}
          >
            -{discount}%
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={e => { e.preventDefault(); setWishlisted(w => !w); }}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 2,
            width: "2.25rem",
            height: "2.25rem",
            background: "rgba(255,253,249,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            backdropFilter: "blur(4px)",
            transition: "all var(--bc-fast)",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(-4px)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? "var(--bc-brand-mauve)" : "none"} stroke={wishlisted ? "var(--bc-brand-mauve)" : "var(--bc-text-ink)"} strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Quick view */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "1rem",
            background: "rgba(26,15,22,0.88)",
            backdropFilter: "blur(4px)",
            transform: hovered ? "translateY(0)" : "translateY(100%)",
            transition: "transform 360ms cubic-bezier(0.16,1,0.3,1)",
            textAlign: "center",
          }}
        >
          <Link
            href={product.href}
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.6875rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--bc-cream)",
              fontWeight: 500,
            }}
          >
            Quick View
          </Link>
        </div>
      </div>

      {/* Product info */}
      <Link href={product.href} style={{ display: "block" }}>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.625rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--bc-text-muted)",
            marginBottom: "0.3rem",
            fontWeight: 500,
          }}
        >
          {product.category}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(1rem, 1.2vw, 1.1875rem)",
            fontWeight: 500,
            color: "var(--bc-text-ink)",
            margin: "0 0 0.625rem",
            lineHeight: 1.2,
          }}
        >
          {product.name}
        </h3>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--bc-text-ink)",
              letterSpacing: "-0.01em",
            }}
          >
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && (
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.875rem",
                color: "var(--bc-text-muted)",
                textDecoration: "line-through",
                fontWeight: 400,
              }}
            >
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Color swatches */}
        <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.625rem" }}>
          {product.colors.map((c, i) => (
            <span
              key={i}
              style={{
                width: "0.875rem",
                height: "0.875rem",
                borderRadius: "50%",
                background: c,
                border: i === 0 ? "1.5px solid var(--bc-text-muted)" : "1.5px solid transparent",
                outline: i === 0 ? "1px solid rgba(0,0,0,0)" : "none",
              }}
              aria-label={`Color option ${i + 1}`}
            />
          ))}
        </div>
      </Link>
    </article>
  );
}
