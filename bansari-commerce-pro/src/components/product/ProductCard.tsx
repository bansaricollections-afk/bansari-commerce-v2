"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
  /* ── Availability ──
     Size-managed products get their badge from per-size inventory. A
     product-level total is never allowed to imply a size is available, and
     "Only 1 left" is shown only when a single size is sellable with exactly
     one unit left. Products without variants keep the legacy <= 5 rule. */
  const sizeAvailability = (product as any).sizeAvailability as
    | { label: string; status: string; available: number }[]
    | undefined;
  const isSizeManaged = Array.isArray(sizeAvailability) && sizeAvailability.length > 0;
  const sellableSizes = isSizeManaged
    ? sizeAvailability!.filter((s) => s.status !== "SOLD_OUT")
    : [];
  const isSoldOut = isSizeManaged && sellableSizes.length === 0;
  const onlyOneLeftSize =
    isSizeManaged && sellableSizes.length === 1 && sellableSizes[0]!.status === "ONLY_ONE_LEFT"
      ? sellableSizes[0]!
      : null;
  const isLowStock = isSizeManaged
    ? !isSoldOut &&
      !onlyOneLeftSize &&
      sellableSizes.some((s) => s.status === "LOW_STOCK" || s.status === "ONLY_ONE_LEFT")
    : ((product as any).stock ?? 999) <= 5;
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
    // A size-managed product cannot be added without choosing a size.
    if (isSizeManaged) {
      router.push(`/product/${product.id}`);
      return;
    }
    addItem({ productId: product.id, quantity: 1 });
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 1800);
  }

  /* Shared badge base classes — restrained brand palette, no marketplace
     amber/rose. Gold marks the premium signal, ink marks state. */
  const badgeBase =
    "px-2.5 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] leading-none";

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container — 2:3, editorial portrait ──
         Taller than the previous 3:4 so the photograph, not the metadata
         block, carries the card. ── */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#F7F3EE]">
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
          className="absolute left-3 top-3 flex flex-col items-start gap-1.5"
          aria-hidden="true"
        >
          {isOnSale && (
            <span className={`${badgeBase} bg-[#8A5A6A] text-white`}>
              -{discountPct}%
            </span>
          )}
          {isNew && !isOnSale && (
            <span className={`${badgeBase} bg-[#1A0F16] text-[#FFFDF9]`}>
              New
            </span>
          )}
          {isBestSeller && (
            <span className={`${badgeBase} bg-[#C9A96E] text-[#1A0F16]`}>
              Best Seller
            </span>
          )}
          {isSoldOut && (
            <span className={`${badgeBase} bg-[#FFFDF9] text-[#1A0F16] border border-[#1A0F16]/15`}>
              Sold Out
            </span>
          )}
          {onlyOneLeftSize && (
            <span className={`${badgeBase} bg-[#8C3A3A] text-white`}>
              {onlyOneLeftSize.label} &middot; Only 1 left
            </span>
          )}
          {isLowStock && (
            <span className={`${badgeBase} bg-[#8C3A3A] text-white`}>
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
          className="absolute right-1 top-1 flex items-center justify-center transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-inset"
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

        {/* ── Hover actions — one flush edge-to-edge bar rather than two
             floating pills, which read as UI chrome sitting on the image.
             Revealed by keyboard focus as well as pointer hover: the controls
             below are always in the natural tab order, so the bar must become
             visible and interactive when focus lands inside the card, or a
             keyboard user would be focusing an invisible target. The
             group-focus-within variants outrank the base opacity/translate
             utilities on specificity, so they win without touching the
             existing hover path. ── */}
        <div
          className={[
            "absolute bottom-0 left-0 right-0 flex items-stretch bg-[#FFFDF9]/95 backdrop-blur-sm",
            "transition-all duration-300 ease-out",
            hovered
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-full pointer-events-none",
            "group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto",
          ].join(" ")}
        >
          {/* Quick View */}
          <Link
            href={`/product/${product.id}`}
            aria-label={`Quick view ${displayName}`}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 py-3",
              "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1A0F16]",
              "transition-colors duration-200 hover:bg-[#1A0F16] hover:text-[#FFFDF9]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A5A6A]",
            ].join(" ")}
          >
            <Eye size={12} aria-hidden="true" />
            Quick View
          </Link>

          <span className="w-px self-stretch bg-[#1A0F16]/10" aria-hidden="true" />

          {/* The copy now names the action that actually happens. A
              size-managed product navigates to the PDP, so it reads "View
              Details"; only a non-size-managed product adds to the cart
              directly, so only that case reads "Add to Cart". The previous
              "Quick Add" / "Choose Size" pair described neither outcome
              accurately. handleQuickAdd itself is unchanged. */}
          <button
            type="button"
            aria-label={
              isSizeManaged
                ? `View details for ${displayName}`
                : `Add ${displayName} to cart`
            }
            onClick={handleQuickAdd}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 py-3",
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A5A6A]",
              quickAdded
                ? "bg-[#8A5A6A] text-white"
                : "text-[#1A0F16] hover:bg-[#1A0F16] hover:text-[#FFFDF9]",
            ].join(" ")}
          >
            <ShoppingBag size={12} aria-hidden="true" />
            {quickAdded ? "Added ✓" : isSizeManaged ? "View Details" : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* ── Metadata — below image ──
         Reordered to one editorial run: collection → name → craft → price →
         availability. The trailing "Discover →" link was removed: the image,
         the name and the hover bar all already open the same PDP, so it was a
         fourth duplicate affordance and the row that made the card read as a
         functional listing rather than a piece of editorial. ── */}
      <div className="mt-4 flex flex-col">

        {/* Collection eyebrow */}
        {product.collection && (
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8A5A6A]">
            {product.collection}
          </p>
        )}

        {/* Product name */}
        <Link
          href={`/product/${product.id}`}
          /* `.bc-serif`, not `font-[family:var(--font-playfair)]` — the
             `family:` type hint is not valid in Tailwind v4 (it is
             `family-name`), so that class emitted no rule and the product name
             rendered in the inherited sans. */
          className="bc-serif mt-1.5 text-[1.125rem] font-normal leading-[1.3] text-slate-900 transition-colors duration-200 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
        >
          {displayName}
        </Link>

        {/* Craft detail */}
        {craftDetail && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{craftDetail}</p>
        )}

        {/* Rating */}
        {rating !== undefined && (
          <div
            className="mt-2 flex items-center gap-1.5"
            aria-label={`Rated ${rating} out of 5${reviewCount !== undefined ? `, ${reviewCount} reviews` : ""}`}
          >
            <div className="flex items-center gap-[2px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  strokeWidth={0}
                  fill={i < Math.floor(rating) ? "#C9A96E" : "#E2E8F0"}
                />
              ))}
            </div>
            {reviewCount !== undefined && (
              <span className="text-[10px] text-slate-400">({reviewCount})</span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <p className="text-[15px] font-medium tabular-nums tracking-[-0.01em] text-slate-900">
            &#x20B9;{product.price.toLocaleString("en-IN")}
          </p>
          {isOnSale && originalPrice && (
            <p className="text-[12px] tabular-nums font-light text-slate-400 line-through">
              &#x20B9;{originalPrice.toLocaleString("en-IN")}
            </p>
          )}
          {isOnSale && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A]">
              {discountPct}% off
            </p>
          )}
        </div>

        {/* Size availability — real per-size inventory, never a product total */}
        {isSizeManaged && (
          <p className="mt-2 text-[11px] tracking-[0.02em] text-slate-500">
            {isSoldOut
              ? "Sold out in all sizes"
              : `${sellableSizes.map((s) => s.label).join(" · ")} available`}
          </p>
        )}
      </div>
    </article>
  );
}
