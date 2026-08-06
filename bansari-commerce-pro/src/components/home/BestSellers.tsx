"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface BestSeller {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  reviews: number;
  rating: number;
  soldCount: string;
  image: string;
  hoverImage: string;
  href: string;
  colors: string[];
  isNew?: boolean;
}

const BEST_SELLERS: BestSeller[] = [
  {
    id: "bs-1",
    name: "Banarasi Silk Saree",
    category: "Sarees",
    price: 6999,
    reviews: 284,
    rating: 4.9,
    soldCount: "2,400+",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80&auto=format&fit=crop",
    href: "/product/banarasi-silk-saree",
    colors: ["#8A1E3C", "#C9A96E", "#2C4A3A", "#4A3728"],
  },
  {
    id: "bs-2",
    name: "Lucknowi Chikankari Anarkali",
    category: "Anarkali Sets",
    price: 3799,
    originalPrice: 4999,
    reviews: 196,
    rating: 4.8,
    soldCount: "1,800+",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=600&q=80&auto=format&fit=crop",
    href: "/product/lucknowi-chikankari-anarkali",
    colors: ["#F5F0EA", "#C4757A", "#4A3728"],
    isNew: true,
  },
  {
    id: "bs-3",
    name: "Embroidered Sharara Set",
    category: "Festive Wear",
    price: 5499,
    reviews: 152,
    rating: 4.7,
    soldCount: "950+",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop",
    href: "/product/embroidered-sharara-set",
    colors: ["#2C4A3A", "#C9A96E", "#8A1E3C"],
  },
  {
    id: "bs-4",
    name: "Linen Coord Set",
    category: "Daily Wear",
    price: 2299,
    reviews: 318,
    rating: 4.8,
    soldCount: "3,100+",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop",
    href: "/product/linen-coord-set",
    colors: ["#E8D5B0", "#4A3728", "#2C1A24"],
  },
  {
    id: "bs-5",
    name: "Kalamkari Kurta",
    category: "Kurta Sets",
    price: 1899,
    reviews: 241,
    rating: 4.7,
    soldCount: "1,500+",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80&auto=format&fit=crop",
    hoverImage: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80&auto=format&fit=crop",
    href: "/product/kalamkari-kurta",
    colors: ["#8A5A6A", "#4A3728", "#2C4A3A", "#E8A87C"],
  },
];

export default function BestSellers() {
  return (
    <section
      aria-labelledby="bestsellers-heading"
      style={{
        background: "var(--bc-blush)",
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
              The House Favourites
            </span>
            <h2
              id="bestsellers-heading"
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
              Best Sellers
            </h2>
          </div>
          <Link
            href="/shop"
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
            Shop all
          </Link>
        </div>

        {/* Trust strip */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "clamp(2rem, 3vw, 3rem)",
            flexWrap: "wrap",
          }}
        >
          {[
            { stat: "12,000+", label: "Happy customers" },
            { stat: "4.9★",   label: "Average rating" },
            { stat: "500+",    label: "Products in stock" },
            { stat: "Since 2018", label: "Crafting heritage" },
          ].map(item => (
            <div key={item.stat} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.125rem, 1.5vw, 1.5rem)",
                  fontWeight: 600,
                  color: "var(--bc-brand-mauve)",
                  lineHeight: 1,
                }}
              >
                {item.stat}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.75rem",
                  color: "var(--bc-text-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  width: "1px",
                  height: "1.5rem",
                  background: "var(--bc-border)",
                  marginLeft: "0.5rem",
                }}
              />
            </div>
          ))}
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
        {BEST_SELLERS.map(product => (
          <BestSellerCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function BestSellerCard({ product }: { product: BestSeller }) {
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
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          overflow: "hidden",
          background: "var(--bc-stone)",
          marginBottom: "1rem",
        }}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 60vw, 28vw"
          style={{ objectFit: "cover", transition: "opacity 500ms ease", opacity: hovered ? 0 : 1 }}
        />
        <Image
          src={product.hoverImage}
          alt={`${product.name} alternate`}
          fill
          sizes="(max-width: 640px) 60vw, 28vw"
          style={{ objectFit: "cover", transition: "opacity 500ms ease", opacity: hovered ? 1 : 0 }}
        />

        {/* Sold count badge */}
        <span
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.5625rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
            padding: "0.25rem 0.625rem",
            background: "var(--bc-brand-plum)",
            color: "var(--bc-gold-light)",
          }}
        >
          {product.soldCount} sold
        </span>

        {product.isNew && (
          <span
            style={{
              position: "absolute",
              top: "2.75rem",
              left: "1rem",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "0.25rem 0.625rem",
              background: "var(--bc-brand-mauve)",
              color: "#fff",
            }}
          >
            NEW
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
            margin: "0 0 0.375rem",
            lineHeight: 1.2,
          }}
        >
          {product.name}
        </h3>

        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", gap: "1px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill={i < Math.floor(product.rating) ? "var(--bc-gold)" : "var(--bc-border)"}>
                <path d="M6 1l1.4 2.8 3.1.4-2.2 2.2.5 3.1L6 8l-2.8 1.5.5-3.1L1.5 4.2l3.1-.4z" />
              </svg>
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.6875rem", color: "var(--bc-text-muted)" }}>
            {product.rating} ({product.reviews})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "1rem", fontWeight: 600, color: "var(--bc-text-ink)", letterSpacing: "-0.01em" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && (
            <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.875rem", color: "var(--bc-text-muted)", textDecoration: "line-through" }}>
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
          {discount && (
            <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.75rem", color: "#B91C1C", fontWeight: 600 }}>
              -{discount}%
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.625rem" }}>
          {product.colors.map((c, i) => (
            <span key={i} style={{ width: "0.875rem", height: "0.875rem", borderRadius: "50%", background: c, border: i === 0 ? "1.5px solid var(--bc-text-muted)" : "1.5px solid transparent" }} aria-label={`Color ${i + 1}`} />
          ))}
        </div>
      </Link>
    </article>
  );
}
