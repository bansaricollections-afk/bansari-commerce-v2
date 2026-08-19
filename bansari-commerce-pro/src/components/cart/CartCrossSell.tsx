"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getRemainingForFreeShipping } from "@/lib/shipping";
import type { Product } from "@/types/product";

type Props = {
  /** Cart subtotal in ₹. Threshold logic is delegated to lib/shipping.ts. */
  subtotal: number;
  /** Product ids already in the cart — never recommend these back. */
  cartProductIds: number[];
};

/** Maximum cards rendered. Kept small so the checkout CTA stays dominant. */
const MAX_SUGGESTIONS = 3;

/**
 * True when at least one size is still sellable, or — for products that are
 * not size-managed — when plain stock remains. Mirrors the availability rule
 * ProductActions uses, so nothing sold out is ever suggested.
 */
function isPurchasable(product: Product): boolean {
  const sizes = product.sizeAvailability ?? [];
  if (sizes.length > 0) return sizes.some((s) => s.status !== "SOLD_OUT");
  return (product.stock ?? 0) > 0;
}

/**
 * CartCrossSell — turns the existing free-shipping gap into an actionable
 * suggestion.
 *
 * The cart already tells the customer "Add ₹X more for free shipping" but
 * offers nothing to add, so the only way to act on it was to navigate back to
 * /shop and re-find a product. This surfaces a few purchasable products
 * directly beneath the cart lines.
 *
 * Threshold, remaining amount and the free-shipping rule all come from
 * lib/shipping.ts — this component computes no pricing of its own and renders
 * nothing once the cart already qualifies.
 *
 * Products come from the existing public /api/products/featured endpoint
 * (merchandiser-curated, active-only, and carrying sizeAvailability), so no
 * new API route or service is introduced.
 *
 * The card CTA deliberately links to the PDP rather than adding straight to
 * the cart: every product in this catalogue is size-managed, and
 * validateCartItems rejects an order whose line has no variantId
 * ("Please select a size"). A one-tap add here would build a cart that fails
 * at payment, so size selection stays on the PDP where it belongs.
 */
export default function CartCrossSell({ subtotal, cartProductIds }: Props) {
  const [suggestions, setSuggestions] = useState<Product[] | null>(null);

  const remaining = getRemainingForFreeShipping(subtotal);

  /*
   * The parent rebuilds `cartProductIds` on every render, so depending on the
   * array itself would re-run the effect forever (fetch → setState → render →
   * new array → fetch). Collapsing it to a primitive makes the dependency
   * stable and keeps the effect honest about what it actually reads.
   */
  const cartKey = cartProductIds.join(",");

  useEffect(() => {
    // Already qualifies for free shipping — nothing to nudge toward.
    if (remaining <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/products/featured");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;

        const inCart = new Set(
          cartKey ? cartKey.split(",").map(Number) : []
        );
        const eligible = (json.data as Product[]).filter(
          (p) => !inCart.has(p.id) && isPurchasable(p)
        );

        // Cheapest item that closes the gap on its own comes first, so the
        // suggestion is the least expensive way to qualify. Everything else
        // follows by price so the list stays scannable.
        const bridges = eligible
          .filter((p) => p.price >= remaining)
          .sort((a, b) => a.price - b.price);
        const rest = eligible
          .filter((p) => p.price < remaining)
          .sort((a, b) => b.price - a.price);

        setSuggestions([...bridges, ...rest].slice(0, MAX_SUGGESTIONS));
      } catch {
        // Recommendations are non-essential; a failure must never break the
        // cart, so this stays silent and the section simply does not render.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [remaining, cartKey]);

  // Render nothing when the cart qualifies, while loading, or when no
  // purchasable product remains — avoids an empty box and any layout shift.
  if (remaining <= 0 || !suggestions || suggestions.length === 0) return null;

  return (
    <section
      aria-labelledby="cart-crosssell-heading"
      className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id="cart-crosssell-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
      >
        Add ₹{remaining.toLocaleString("en-IN")} more for free shipping
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {suggestions.map((product) => {
          const image = product.images?.[0]?.url;
          const closesGap = product.price >= remaining;

          return (
            <li key={product.id}>
              <Link
                href={`/product/${product.id}`}
                className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-[#F6F0EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] sm:gap-4"
              >
                {/* min-w-0 lets the text column shrink instead of overflowing
                    at 320px; the thumbnail never reflows. */}
                <div className="relative h-20 w-[54px] flex-shrink-0 overflow-hidden rounded-lg bg-[#F6F0EB]">
                  {image && (
                    <Image
                      src={image}
                      alt={product.name}
                      fill
                      sizes="54px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-900">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[13px] tabular-nums text-slate-700">
                    ₹{product.price.toLocaleString("en-IN")}
                  </p>
                  {closesGap && (
                    <p className="mt-0.5 text-[11px] font-medium text-[#8A5A6A]">
                      Unlocks free shipping
                    </p>
                  )}
                </div>

                <span className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A5A6A]">
                  Choose size
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
