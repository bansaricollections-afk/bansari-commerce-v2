"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

import { useWishlist } from "@/store/wishlist";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

type Props = {
  products: Product[];
};

type SizeAvailability = { label: string; status: string; available: number };

export default function WishlistGrid({ products }: Props) {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();

  const wishlistProducts = products.filter((product) =>
    items.some((item) => item.id === product.id)
  );

  if (wishlistProducts.length === 0) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: "var(--bc-surface-cream)" }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
          <Heart size={64} strokeWidth={1} className="mb-8" style={{ color: "var(--bc-brand-mauve)" }} />

          <h1
            className="font-[family:var(--font-playfair)] text-4xl sm:text-5xl"
            style={{ fontWeight: 400, color: "var(--bc-text-primary)" }}
          >
            My Closet
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--bc-text-secondary)" }}>
            Save your favourite outfits here and revisit them whenever inspiration strikes.
          </p>

          <Link href="/shop" className="bc-cta-primary mt-10">
            Discover Collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bc-surface-cream)" }}>
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1
          className="mb-12 font-[family:var(--font-playfair)] text-4xl sm:text-5xl"
          style={{ fontWeight: 400, color: "var(--bc-text-primary)" }}
        >
          My Closet
        </h1>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {wishlistProducts.map((product) => {
            /* ── Availability, read from real per-size inventory ──
               Mirrors ProductCard exactly. A product-level total is never
               allowed to imply that a particular size is available. */
            const sizeAvailability = (product as unknown as {
              sizeAvailability?: SizeAvailability[];
            }).sizeAvailability;

            const isSizeManaged =
              Array.isArray(sizeAvailability) && sizeAvailability.length > 0;
            const sellableSizes = isSizeManaged
              ? sizeAvailability!.filter((s) => s.status !== "SOLD_OUT")
              : [];
            const isSoldOut = isSizeManaged && sellableSizes.length === 0;

            const imageUrl = product.images?.[0]?.url || "/placeholder.png";

            return (
              <div
                key={product.id}
                className="overflow-hidden transition-colors"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid var(--bc-border-soft)",
                }}
              >
                <Link href={`/product/${product.id}`} className="block">
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#F7F3EE]">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"
                    />
                  </div>
                </Link>

                <div className="flex flex-col gap-3 p-6">
                  <Link href={`/product/${product.id}`}>
                    <h2
                      className="font-[family:var(--font-playfair)] text-xl leading-snug"
                      style={{ fontWeight: 400, color: "var(--bc-text-primary)" }}
                    >
                      {product.name}
                    </h2>
                  </Link>

                  <p
                    className="text-[15px] font-medium tabular-nums"
                    style={{ color: "var(--bc-text-primary)" }}
                  >
                    &#x20B9;{product.price.toLocaleString("en-IN")}
                  </p>

                  {isSizeManaged && (
                    <p className="text-[11px] tracking-[0.02em]" style={{ color: "var(--bc-text-muted)" }}>
                      {isSoldOut
                        ? "Sold out in all sizes"
                        : `${sellableSizes.map((s) => s.label).join(" · ")} available`}
                    </p>
                  )}

                  <div className="mt-1 flex gap-3">
                    {/*
                     * WHY THIS IS A LINK, NOT AN ADD-TO-CART BUTTON
                     *
                     * A size-managed line cannot be added from here. The cart
                     * item would carry no variantId, and validateCartItems
                     * rejects the whole order at payment with "Please select a
                     * size" — with no way back, because the cart page shows the
                     * chosen size but offers no way to choose one. The customer
                     * would only discover it after entering their address.
                     *
                     * CartCrossSell already refuses one-tap adds for exactly
                     * this reason. Size selection belongs on the PDP.
                     *
                     * Sold out is rendered as inert text rather than a disabled
                     * button: there is no action to offer, and a greyed button
                     * invites a click that will never work.
                     */}
                    {isSoldOut ? (
                      <span
                        className="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{
                          backgroundColor: "var(--bc-border-soft)",
                          color: "var(--bc-text-muted)",
                        }}
                      >
                        Sold Out
                      </span>
                    ) : isSizeManaged ? (
                      <Link
                        href={`/product/${product.id}`}
                        aria-label={`Choose a size for ${product.name}`}
                        className="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{
                          backgroundColor: "var(--bc-text-primary)",
                          color: "var(--bc-surface-cream)",
                        }}
                      >
                        <ShoppingBag size={13} aria-hidden="true" />
                        Choose Size
                      </Link>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Add ${product.name} to bag`}
                        onClick={() =>
                          addItem({
                            id: product.id,
                            name: product.name,
                            image: imageUrl,
                            price: product.price,
                            quantity: 1,
                          })
                        }
                        className="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{
                          backgroundColor: "var(--bc-text-primary)",
                          color: "var(--bc-surface-cream)",
                        }}
                      >
                        <ShoppingBag size={13} aria-hidden="true" />
                        Add to Bag
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from closet`}
                      onClick={() => removeItem(product.id)}
                      className="p-3 transition-colors"
                      style={{
                        border: "1px solid var(--bc-border-soft)",
                        color: "var(--bc-text-muted)",
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
