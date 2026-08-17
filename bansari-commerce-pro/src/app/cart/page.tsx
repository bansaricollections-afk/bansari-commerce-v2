"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

import { useCart, useCartHasHydrated, cartLineId } from "@/store/cart";
import CartTrustStrip from "@/components/cart/CartTrustStrip";
import ShippingProgress from "@/components/cart/ShippingProgress";
import {
  getShippingCost,
  getRemainingForFreeShipping,
} from "@/lib/shipping";

// ---------------------------------------------------------------------------
// CartPageSkeleton
// Shown while Zustand persist rehydrates from localStorage.
// Matches the visual weight of the real cart grid to prevent layout shift.
// Mirror of the pattern used in checkout/page.tsx.
// ---------------------------------------------------------------------------

function CartPageSkeleton() {
  return (
    <div
      className="grid gap-12 lg:grid-cols-[2fr_1fr]"
      aria-label="Loading cart"
      aria-busy="true"
    >
      {/* Left column — item skeletons */}
      <div className="space-y-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex gap-6 rounded-3xl bg-white p-6 shadow-sm"
          >
            <div className="h-[180px] w-[140px] animate-pulse rounded-2xl bg-slate-100" />
            <div className="flex flex-1 flex-col justify-between">
              <div className="space-y-2">
                <div className="h-6 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-5 w-1/4 animate-pulse rounded-lg bg-slate-100" />
              </div>
              <div className="flex justify-between">
                <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-6 w-6 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right column — summary skeleton */}
      <div className="sticky top-28 h-fit rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="p-8 space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
          {[1, 2, 3].map((r) => (
            <div key={r} className="flex justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
          <div className="h-14 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CartPage
// ---------------------------------------------------------------------------

export default function CartPage() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
  } = useCart();

  // Identical hydration pattern to checkout/page.tsx.
  // false on SSR + initial client paint; true once Zustand persist has read
  // localStorage. Prevents the empty-cart state from flashing before data loads.
  const hasHydrated = useCartHasHydrated();

  // ── Live availability for the variants in this cart ──────────────────────
  // Read-only projection of the same canonical source the server validates
  // against, so the customer sees the cap before checkout rejects them.
  // Server-side validation remains authoritative — this never grants stock,
  // it only prevents asking for more than exists.
  const [availability, setAvailability] = useState<Record<number, number>>({});

  const variantKey = items
    .map((i) => i.variantId)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!variantKey) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    fetch(`/api/inventory/availability?variantIds=${variantKey}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.availability) setAvailability(data.availability);
      })
      .catch(() => {
        // Availability lookup must never break the cart; without it the
        // customer simply sees no cap and the server still rejects overselling.
      });
    return () => {
      cancelled = true;
    };
  }, [variantKey]);

  /**
   * Maximum quantity for a line.
   * Size-managed line → live variant availability.
   * Legacy line (no variantId) → uncapped here, exactly as before.
   */
  function maxQtyFor(item: (typeof items)[number]): number | null {
    if (typeof item.variantId !== "number") return null;
    const available = availability[item.variantId];
    return typeof available === "number" ? available : null;
  }

  /**
   * A line that asks for more than exists (or for a sold-out size) blocks
   * checkout. Without this the customer only discovers the problem after
   * entering their details and hitting payment.
   */
  const blockedLines = items.filter((item) => {
    const max = maxQtyFor(item);
    return max !== null && (max <= 0 || item.quantity > max);
  });
  const checkoutBlocked = blockedLines.length > 0;

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // All shipping arithmetic sourced from src/lib/shipping.ts
  const shipping = getShippingCost(subtotal);
  const total = subtotal + shipping;
  const remainingForFreeShipping = getRemainingForFreeShipping(subtotal);

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="mb-12 font-[family:var(--font-playfair)] text-5xl font-bold">
          Shopping Bag
        </h1>

        {/* ----------------------------------------------------------------
            Hydration gate
            !hasHydrated  → skeleton (both SSR + initial paint agree → no
                            hydration mismatch)
            hasHydrated + empty → empty-cart state
            hasHydrated + items → full cart grid
        ---------------------------------------------------------------- */}
        {!hasHydrated ? (
          <CartPageSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white p-20 text-center shadow-sm">
            <ShoppingBag
              size={56}
              className="mx-auto text-[#8A5A6A]"
            />

            <h2 className="mt-6 text-3xl font-bold">
              Your shopping bag is empty
            </h2>

            <p className="mt-4 text-gray-500">
              Explore our latest collection and discover your next favourite
              outfit.
            </p>

            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-[#8A5A6A] px-10 py-4 font-semibold text-white transition hover:bg-[#734757]"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
            {/* Cart Items */}
            <div className="space-y-6">
              {items.map((item) => (
                <article
                  key={cartLineId(item)}
                  className="flex gap-6 rounded-3xl bg-white p-6 shadow-sm"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={140}
                    height={180}
                    sizes="140px"
                    className="rounded-2xl object-cover"
                  />

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        {item.name}
                      </h2>

                      {item.size && (
                        <p className="mt-1 text-sm text-slate-500">Size: {item.size}</p>
                      )}

                      {(() => {
                        const max = maxQtyFor(item);
                        if (max === null) return null;
                        if (max <= 0) {
                          return (
                            <p className="mt-1 text-sm font-medium text-red-600">
                              Sold out — remove this item to continue
                            </p>
                          );
                        }
                        if (item.quantity > max) {
                          return (
                            <p className="mt-1 text-sm font-medium text-red-600">
                              Only {max} left in size {item.size ?? ""} — reduce the quantity to continue
                            </p>
                          );
                        }
                        if (item.quantity >= max) {
                          return (
                            <p className="mt-1 text-sm text-amber-700">
                              {max === 1 ? "Only 1 left" : `Only ${max} left`} in this size
                            </p>
                          );
                        }
                        return null;
                      })()}

                      <p className="mt-2 text-xl font-bold text-[#8A5A6A]">
                        ₹{item.price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-xl border">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(cartLineId(item))}
                          className="p-3"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={18} />
                        </button>

                        <span className="w-12 text-center">
                          {item.quantity}
                        </span>

                        {(() => {
                          const max = maxQtyFor(item);
                          const atCap = max !== null && item.quantity >= max;
                          return (
                            <button
                              type="button"
                              onClick={() => !atCap && increaseQuantity(cartLineId(item))}
                              disabled={atCap}
                              className="p-3 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                              title={atCap ? "No more stock available in this size" : undefined}
                            >
                              <Plus size={18} />
                            </button>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(cartLineId(item))}
                        aria-label="Remove item"
                        className="text-red-500 transition hover:text-red-700"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Order Summary */}
            <aside className="sticky top-28 h-fit rounded-3xl bg-white shadow-sm overflow-hidden">
              <ShippingProgress totalAmount={subtotal} />

              <div className="p-8">
                <h2 className="mb-8 text-3xl font-bold">
                  Order Summary
                </h2>

                {remainingForFreeShipping > 0 ? (
                  <div className="mb-6 rounded-2xl bg-[#FFF5F7] p-4 text-sm text-[#8A5A6A]">
                    Add ₹
                    {remainingForFreeShipping.toLocaleString("en-IN")}
                    {" "}more to unlock FREE shipping.
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl bg-green-100 p-4 text-sm font-medium text-green-700">
                    🎉 You qualify for FREE shipping.
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {shipping === 0
                        ? "FREE"
                        : `₹${shipping.toLocaleString("en-IN")}`}
                    </span>
                  </div>

                  <hr />

                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {checkoutBlocked && (
                  <p className="mt-6 text-sm font-medium text-red-600">
                    Adjust the highlighted item{blockedLines.length > 1 ? "s" : ""} above to continue —
                    the quantity requested is no longer available.
                  </p>
                )}

                {/* Desktop checkout CTA — hidden on mobile, replaced by sticky bar */}
                {checkoutBlocked ? (
                  <button
                    type="button"
                    disabled
                    className="mt-10 hidden sm:flex w-full items-center justify-center gap-3 rounded-full bg-slate-300 py-4 font-semibold text-white cursor-not-allowed"
                  >
                    Secure Checkout
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="mt-10 hidden sm:flex items-center justify-center gap-3 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
                  >
                    Secure Checkout
                    <ArrowRight size={18} />
                  </Link>
                )}

                {/* Mobile fallback within summary — visible when no sticky bar support.
                    It previously carried aria-hidden="true" + tabIndex={-1} while
                    remaining visually rendered below the sm breakpoint, so mobile
                    keyboard users saw a Secure Checkout button that Tab skipped and
                    screen readers never announced. The sticky bar duplicate only
                    exists once `hasHydrated && items.length > 0`, so before hydration
                    this was the sole visible checkout control and it was inoperable.
                    It is now a normal link; the sticky-bar copy is labelled to
                    distinguish the two for assistive tech. Destination unchanged. */}
                {!checkoutBlocked && (
                  <Link
                    href="/checkout"
                    aria-label="Secure checkout (order summary)"
                    className="mt-10 flex sm:hidden items-center justify-center gap-3 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
                  >
                    Secure Checkout
                    <ArrowRight size={18} />
                  </Link>
                )}
              </div>

              <CartTrustStrip />
            </aside>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------
          Mobile sticky checkout bar
          - sm:hidden  — desktop uses the button inside the aside
          - Only rendered when hydrated AND cart is non-empty
          - pb-safe  — env(safe-area-inset-bottom) for iPhone home bar
      ---------------------------------------------------------------- */}
      {hasHydrated && items.length > 0 && (
        <div
          className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-100 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-base font-bold text-slate-900">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
          {checkoutBlocked ? (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 w-full rounded-full bg-slate-300 py-3.5 font-semibold text-white text-sm cursor-not-allowed"
            >
              Adjust quantity to continue
            </button>
          ) : (
            <Link
              href="/checkout"
              /* Distinguishes this from the in-summary checkout link now that
                 both are exposed to assistive tech. Visible text is unchanged. */
              aria-label="Secure checkout (sticky bar)"
              className="flex items-center justify-center gap-2 w-full rounded-full bg-[#8A5A6A] py-3.5 font-semibold text-white text-sm transition hover:bg-[#734757]"
            >
              Secure Checkout
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
