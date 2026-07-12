"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Product } from "@/types";

type Props = {
  product: Product;
  /** Pass true for the first card in the rail (LCP image) */
  priority?: boolean;
};

export default function ProductCard({ product, priority = false }: Props) {
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);

  const primaryImage = product.images?.[0]?.url || "/placeholder.png";
  const hoverImage = product.images?.[1]?.url || primaryImage;

  /**
   * shortName fallback chain:
   *   product.shortName  (editorial name, e.g. "Amara")
   *   → product.collection (e.g. "Bridal Sarees")
   *   → product.name     (full catalogue name — last resort only)
   */
  const displayName =
    (product as any).shortName ||
    product.collection ||
    product.name;

  /**
   * Craft detail: work technique + fabric, sourced from specifications.
   * Renders nothing if both are absent — no empty line.
   */
  const craftDetail = [
    (product as any).specifications?.work,
    (product as any).specifications?.fabric,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — 3:4, no border, no radius, no shadow */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <Link
          href={`/product/${product.id}`}
          aria-label={`View ${displayName}`}
          className="block h-full w-full"
          tabIndex={0}
        >
          {/* Primary image */}
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
            className={[
              "object-cover object-top",
              "transition-[transform,opacity] duration-[750ms] ease-out",
              hovered
                ? "scale-[1.02] opacity-0"
                : "scale-100 opacity-100",
            ].join(" ")}
          />

          {/* Hover image — crossfade only, no additional scale */}
          <Image
            src={hoverImage}
            alt={`${product.name} alternate view`}
            fill
            loading="lazy"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
            className={[
              "absolute inset-0 object-cover object-top",
              "transition-[transform,opacity] duration-[750ms] ease-out",
              hovered
                ? "scale-[1.02] opacity-100"
                : "scale-100 opacity-0",
            ].join(" ")}
          />
        </Link>

        {/* Wishlist — always visible, top-right, no background, no shadow */}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          onClick={() => setWishlisted((v) => !v)}
          className="absolute right-0 top-0 flex items-start justify-end p-3"
          style={{ width: 44, height: 44 }}
        >
          <Heart
            size={16}
            strokeWidth={1.5}
            className="transition-colors duration-200"
            style={{
              color: wishlisted ? "#8A5A6A" : "#C4A882",
              fill: wishlisted ? "#8A5A6A" : "none",
            }}
          />
        </button>
      </div>

      {/* Metadata — below image, left-aligned, no card container */}
      <div className="mt-4 space-y-1">

        {/* Collection eyebrow */}
        {product.collection && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A5A6A]">
            {product.collection}
          </p>
        )}

        {/* Product name — Playfair, editorial weight */}
        <Link
          href={`/product/${product.id}`}
          className="block font-[family:var(--font-playfair)] text-base font-normal leading-snug text-[#1C1917] transition-colors duration-200 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          tabIndex={0}
        >
          {displayName}
        </Link>

        {/* Craft detail — only renders if data present */}
        {craftDetail && (
          <p className="text-xs font-normal text-[#A8A29E]">{craftDetail}</p>
        )}

        {/* Price — quiet, no emphasis colour */}
        <p className="text-sm font-normal text-[#78716C]">
          &#x20B9;{product.price.toLocaleString("en-IN")}
        </p>

        {/* CTA — always visible, no button/pill */}
        <Link
          href={`/product/${product.id}`}
          className="inline-block text-xs font-medium tracking-[0.08em] text-[#78716C] underline-offset-4 transition-colors duration-200 hover:text-[#1C1917] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          tabIndex={0}
          aria-label={`Discover ${displayName}`}
        >
          Discover &rarr;
        </Link>

      </div>
    </article>
  );
}
