"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

import { useCart, useCartHasHydrated } from "@/store/cart";
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
                  key={item.id}
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

                      <p className="mt-2 text-xl font-bold text-[#8A5A6A]">
                        ₹{item.price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-xl border">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="p-3"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={18} />
                        </button>

                        <span className="w-12 text-center">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          className="p-3"
                          aria-label="Increase quantity"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
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

                {/* Desktop checkout CTA — hidden on mobile, replaced by sticky bar */}
                <Link
                  href="/checkout"
                  className="mt-10 hidden sm:flex items-center justify-center gap-3 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
                >
                  Secure Checkout
                  <ArrowRight size={18} />
                </Link>

                {/* Mobile fallback within summary — visible when no sticky bar support */}
                <Link
                  href="/checkout"
                  className="mt-10 flex sm:hidden items-center justify-center gap-3 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  Secure Checkout
                  <ArrowRight size={18} />
                </Link>
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
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 w-full rounded-full bg-[#8A5A6A] py-3.5 font-semibold text-white text-sm transition hover:bg-[#734757]"
          >
            Secure Checkout
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </main>
  );
}
