"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Product } from "@/services/product.service";

export default function BestSellersRail({ products }: { products: Product[] }) {
  return (
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
      {products.map((product) => (
        <BestSellerCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function BestSellerCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false);

  const image = product.images?.[0]?.url ?? "";
  const hoverImage = product.images?.[1]?.url ?? image;
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
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
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 60vw, 28vw"
          style={{ objectFit: "cover", transition: "opacity 500ms ease", opacity: hovered ? 0 : 1 }}
        />
        {hoverImage !== image && (
          <Image
            src={hoverImage}
            alt={`${product.name} alternate`}
            fill
            sizes="(max-width: 640px) 60vw, 28vw"
            style={{ objectFit: "cover", transition: "opacity 500ms ease", opacity: hovered ? 1 : 0 }}
          />
        )}

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
          Best Seller
        </span>

        {discount && (
          <span
            style={{
              position: "absolute",
              top: "2.75rem",
              left: "1rem",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              background: "#B91C1C",
              color: "#fff",
            }}
          >
            -{discount}%
          </span>
        )}

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
            href={`/product/${product.id}`}
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

      <Link href={`/product/${product.id}`} style={{ display: "block" }}>
        {product.category && (
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
        )}
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

        {/* Real rating — only rendered if the product actually has reviews */}
        {typeof product.rating === "number" && product.reviewCount ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", gap: "1px" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill={i < Math.floor(product.rating!) ? "var(--bc-gold)" : "var(--bc-border)"}>
                  <path d="M6 1l1.4 2.8 3.1.4-2.2 2.2.5 3.1L6 8l-2.8 1.5.5-3.1L1.5 4.2l3.1-.4z" />
                </svg>
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.6875rem", color: "var(--bc-text-muted)" }}>
              ({product.reviewCount})
            </span>
          </div>
        ) : null}

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
          {discount && product.oldPrice && (
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.875rem",
                color: "var(--bc-text-muted)",
                textDecoration: "line-through",
                fontWeight: 400,
              }}
            >
              ₹{product.oldPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
