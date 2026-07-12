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

import { useCart } from "@/store/cart";

export default function CartPage() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
  } = useCart();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const shipping = subtotal >= 2999 ? 0 : 99;
  const total = subtotal + shipping;

  const remainingForFreeShipping = Math.max(0, 2999 - subtotal);

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="mb-12 font-[family:var(--font-playfair)] text-5xl font-bold">
          Shopping Bag
        </h1>

        {items.length === 0 ? (
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

            <aside className="sticky top-28 h-fit rounded-3xl bg-white p-8 shadow-sm">
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

                  <span>
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
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

                  <span>
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-10 flex items-center justify-center gap-3 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
              >
                Secure Checkout

                <ArrowRight size={18} />
              </Link>

              <p className="mt-6 text-center text-sm text-gray-500">
                Secure payment • Trusted delivery • Quality checked
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
