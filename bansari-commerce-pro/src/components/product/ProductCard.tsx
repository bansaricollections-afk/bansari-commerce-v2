"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, ShoppingBag, Eye } from "lucide-react";
import { useCart } from "@/context/CartContext";

import { Product } from "@/types";

type Props = {
  product: Product;
  /** Pass true for the first card in the rail (LCP image) */
  priority?: boolean;
};

export default function ProductCard({ product, priority = false }: Props) {
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [quickAdded, setQuickAdded] = useState(false);
  const { addItem } = useCart();

  const primaryImage = product.images?.[0]?.url || "/placeholder.png";
  const hoverImage = product.images?.[1]?.url || primaryImage;

  const displayName =
    (product as any).shortName ||
    product.collection ||
    product.name;

  const craftDetail = [
    (product as any).specifications?.work,
    (product as any).specifications?.fabric,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ── Badge logic ── */
  const isNew = (product as any).isNew ?? false;
  const isBestSeller = (product as any).isBestSeller ?? false;
  const isLowStock = ((product as any).stock ?? 999) <= 5;
  const originalPrice = (product as any).originalPrice as number | undefined;
  const discountPct =
    originalPrice && originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0;
  const isOnSale = discountPct > 0;

  /* ── Mock rating ── */
  const rating = (product as any).rating as number | undefined;
  const reviewCount = (product as any).reviewCount as number | undefined;

  /* ── Quick Add ── */
  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: product.id, quantity: 1 });
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 1800);
  }

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container — 3:4 ── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-50">
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
              "object-cover object-[center_12%]",
              "transition-[opacity] duration-[700ms] ease-out",
              hovered ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />

          {/* Hover image — gentle zoom */}
          <Image
            src={hoverImage}
            alt={`${product.name} alternate view`}
            fill
            loading="lazy"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
            className={[
              "absolute inset-0 object-cover object-[center_12%]",
              "transition-[transform,opacity] duration-[700ms] ease-out",
              hovered ? "scale-[1.04] opacity-100" : "scale-100 opacity-0",
            ].join(" ")}
          />

          {/* Hover overlay — very subtle scrim */}
          <div
            className={[
              "absolute inset-0 bg-slate-900/0 transition-colors duration-500",
              hovered ? "bg-slate-900/[0.04]" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        </Link>

        {/* ── Badges — top left ── */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isOnSale && (
            <span className="bg-[#8A5A6A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              -{discountPct}%
            </span>
          )}
          {isNew && !isOnSale && (
            <span className="border border-slate-900 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-900">
              New
            </span>
          )}
          {isBestSeller && (
            <span className="bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">
              Best Seller
            </span>
          )}
          {isLowStock && (
            <span className="border border-[#8A5A6A]/40 bg-white/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A]">
              Low Stock
            </span>
          )}
        </div>

        {/* ── Wishlist — top right ── */}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWishlisted((v) => !v); }}
          className="absolute right-0 top-0 flex items-start justify-end p-3 transition-transform duration-200 hover:scale-110"
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

        {/* ── Quick View — appears on hover, bottom-left ── */}
        <Link
          href={`/product/${product.id}`}
          aria-label={`Quick view ${displayName}`}
          className={[
            "absolute bottom-3 left-3 flex items-center gap-1.5 border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700 backdrop-blur-sm",
            "transition-all duration-300",
            hovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none",
          ].join(" ")}
          tabIndex={hovered ? 0 : -1}
        >
          <Eye size={11} aria-hidden="true" />
          Quick View
        </Link>

        {/* ── Quick Add — appears on hover, bottom-right ── */}
        <button
          type="button"
          aria-label={`Quick add ${displayName} to cart`}
          onClick={handleQuickAdd}
          className={[
            "absolute bottom-3 right-3 flex items-center gap-1.5 border bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm",
            "transition-all duration-300",
            hovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none",
            quickAdded
              ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
              : "border-white/80 text-slate-700",
          ].join(" ")}
          tabIndex={hovered ? 0 : -1}
        >
          <ShoppingBag size={11} aria-hidden="true" />
          {quickAdded ? "Added" : "Quick Add"}
        </button>
      </div>

      {/* ── Metadata — below image ── */}
      <div className="mt-3.5 space-y-1">

        {/* Collection eyebrow */}
        {product.collection && (
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A5A6A]">
            {product.collection}
          </p>
        )}

        {/* Product name */}
        <Link
          href={`/product/${product.id}`}
          className="block font-[family:var(--font-playfair)] text-[0.95rem] font-normal leading-snug text-slate-900 transition-colors duration-200 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          tabIndex={0}
        >
          {displayName}
        </Link>

        {/* Craft detail */}
        {craftDetail && (
          <p className="text-[11px] text-slate-400">{craftDetail}</p>
        )}

        {/* Rating */}
        {rating !== undefined && (
          <div className="flex items-center gap-1.5" aria-label={`Rated ${rating} out of 5`}>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  strokeWidth={0}
                  fill={i < Math.floor(rating) ? "#C4A84C" : "#E2E8F0"}
                  aria-hidden="true"
                />
              ))}
            </div>
            {reviewCount !== undefined && (
              <span className="text-[10px] text-slate-400">({reviewCount})</span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-semibold text-slate-900">
            &#x20B9;{product.price.toLocaleString("en-IN")}
          </p>
          {isOnSale && originalPrice && (
            <p className="text-[11px] text-slate-400 line-through">
              &#x20B9;{originalPrice.toLocaleString("en-IN")}
            </p>
          )}
          {isOnSale && (
            <p className="text-[10px] font-semibold text-[#8A5A6A]">{discountPct}% off</p>
          )}
        </div>

        {/* Discover CTA */}
        <Link
          href={`/product/${product.id}`}
          className="inline-block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 underline-offset-4 transition-colors duration-200 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          tabIndex={0}
          aria-label={`Discover ${displayName}`}
        >
          Discover &rarr;
        </Link>
      </div>
    </article>
  );
}
