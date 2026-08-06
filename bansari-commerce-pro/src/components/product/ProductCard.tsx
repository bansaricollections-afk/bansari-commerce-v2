"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, ShoppingBag, Eye } from "lucide-react";
import { useCart } from "@/hooks/useCart";

import { Product } from "@/types";
import { logCardRender } from "@/lib/debug/product-debug";

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

  useEffect(() => {
    logCardRender(product.id, product.name, primaryImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* Shared badge base classes */
  const badgeBase =
    "px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em] leading-none";

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container — 3:4 ── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F7F3EE]">
        <Link
          href={`/product/${product.id}`}
          aria-label={`View ${displayName}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-inset"
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
              "transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform]",
              hovered ? "opacity-0 scale-100" : "opacity-100 scale-100",
            ].join(" ")}
          />

          {/* Hover image — reveals with gentle zoom */}
          <Image
            src={hoverImage}
            alt={`${product.name} — alternate view`}
            fill
            loading="lazy"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
            className={[
              "absolute inset-0 object-cover object-[center_12%] will-change-[opacity,transform]",
              "transition-[transform,opacity] duration-700 ease-out",
              hovered ? "scale-[1.04] opacity-100" : "scale-[1.01] opacity-0",
            ].join(" ")}
          />

          {/* Subtle scrim on hover */}
          <div
            className={[
              "absolute inset-0 transition-colors duration-500 pointer-events-none",
              hovered ? "bg-slate-900/[0.03]" : "bg-transparent",
            ].join(" ")}
            aria-hidden="true"
          />
        </Link>

        {/* ── Badges — top left ── */}
        <div
          className="absolute left-2.5 top-2.5 flex flex-col gap-1.5"
          aria-hidden="true"
        >
          {isOnSale && (
            <span className={`${badgeBase} bg-[#8A5A6A] text-white`}>
              -{discountPct}%
            </span>
          )}
          {isNew && !isOnSale && (
            <span className={`${badgeBase} bg-slate-900 text-white`}>
              New
            </span>
          )}
          {isBestSeller && (
            <span className={`${badgeBase} bg-amber-500 text-white`}>
              Best Seller
            </span>
          )}
          {isLowStock && (
            <span className={`${badgeBase} bg-rose-600 text-white`}>
              Low Stock
            </span>
          )}
        </div>

        {/* ── Wishlist — top right, always visible, 44×44 touch target ── */}
        <button
          type="button"
          aria-label={wishlisted ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
          aria-pressed={wishlisted}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWishlisted((v) => !v);
          }}
          className="absolute right-0 top-0 flex items-center justify-center transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1"
          style={{ width: 44, height: 44 }}
        >
          <Heart
            size={17}
            strokeWidth={1.5}
            className="transition-all duration-200 drop-shadow-sm"
            style={{
              color: wishlisted ? "#8A5A6A" : "rgba(255,255,255,0.9)",
              fill: wishlisted ? "#8A5A6A" : "none",
              filter: wishlisted ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
            }}
          />
        </button>

        {/* ── Hover actions row (Quick View + Quick Add) ── */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 pb-2.5"
          aria-hidden={!hovered}
        >
          {/* Quick View */}
          <Link
            href={`/product/${product.id}`}
            aria-label={`Quick view ${displayName}`}
            className={[
              "flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-white/60 px-3 py-2",
              "text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700",
              "transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
              hovered
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none",
            ].join(" ")}
            tabIndex={hovered ? 0 : -1}
          >
            <Eye size={11} aria-hidden="true" />
            Quick View
          </Link>

          {/* Quick Add */}
          <button
            type="button"
            aria-label={`Quick add ${displayName} to cart`}
            onClick={handleQuickAdd}
            className={[
              "flex items-center gap-1.5 border px-3 py-2 backdrop-blur-sm",
              "text-[10px] font-semibold uppercase tracking-[0.1em]",
              "transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
              hovered
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none",
              quickAdded
                ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                : "border-white/60 bg-white/90 text-slate-700",
            ].join(" ")}
            tabIndex={hovered ? 0 : -1}
          >
            <ShoppingBag size={11} aria-hidden="true" />
            {quickAdded ? "Added ✓" : "Quick Add"}
          </button>
        </div>
      </div>

      {/* ── Metadata — below image ── */}
      <div className="mt-4 flex flex-col gap-1.5">

        {/* Collection eyebrow */}
        {product.collection && (
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8A5A6A]">
            {product.collection}
          </p>
        )}

        {/* Product name */}
        <Link
          href={`/product/${product.id}`}
          className="font-[family:var(--font-playfair)] text-[1rem] font-normal leading-snug text-slate-900 transition-colors duration-200 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
        >
          {displayName}
        </Link>

        {/* Craft detail */}
        {craftDetail && (
          <p className="text-[11px] leading-relaxed text-slate-400">{craftDetail}</p>
        )}

        {/* Rating */}
        {rating !== undefined && (
          <div
            className="flex items-center gap-1.5"
            aria-label={`Rated ${rating} out of 5${reviewCount !== undefined ? `, ${reviewCount} reviews` : ""}`}
          >
            <div className="flex items-center gap-[2px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  strokeWidth={0}
                  fill={i < Math.floor(rating) ? "#C4A84C" : "#E2E8F0"}
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
          <p className="text-[14px] font-semibold tabular-nums text-slate-900">
            &#x20B9;{product.price.toLocaleString("en-IN")}
          </p>
          {isOnSale && originalPrice && (
            <p className="text-[12px] tabular-nums text-slate-400 line-through">
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
          className="w-fit text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 underline-offset-4 transition-colors duration-200 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          aria-label={`Discover ${displayName}`}
        >
          Discover &rarr;
        </Link>
      </div>
    </article>
  );
}
