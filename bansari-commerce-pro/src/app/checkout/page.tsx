"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import RazorpayButton from "@/components/checkout/RazorpayButton";
import { useCart } from "@/store/cart";

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();

  const subtotal = totalPrice();
  const shipping = subtotal >= 2999 ? 0 : 99;
  const total = subtotal + shipping;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const isValid =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    addressLine1.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    postalCode.trim().length > 0;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-[#FFFDF9]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Link
            href="/cart"
            className="mb-10 inline-flex items-center gap-2 text-[#8A5A6A] transition hover:underline"
          >
            <ArrowLeft size={18} />
            Back to Cart
          </Link>

          <h1 className="mb-12 font-[family:var(--font-playfair)] text-5xl font-bold">
            Secure Checkout
          </h1>

          <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
            {/* LEFT */}
            <div className="space-y-8">
              <section className="rounded-3xl bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Contact Information
                </h2>

                <div className="grid gap-5">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />

                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />
                </div>
              </section>

              <section className="rounded-3xl bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Delivery Address
                </h2>

                <div className="grid gap-5">
                  <input
                    type="text"
                    placeholder="House / Flat No."
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />

                  <input
                    type="text"
                    placeholder="Street / Area"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                    />

                    <input
                      type="text"
                      placeholder="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="PIN Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
                  />
                </div>
              </section>

              <section className="rounded-3xl bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Payment Method
                </h2>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                  <input
                    type="radio"
                    name="payment"
                    defaultChecked
                  />
                  Razorpay (UPI / Credit Card / Debit Card / Net Banking)
                </label>
              </section>
            </div>

            {/* RIGHT */}
            <aside className="sticky top-24 h-fit rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="mb-8 text-3xl font-bold">
                Order Summary
              </h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>

                    <span>
                      ₹
                      {(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}

                <hr />

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

              <RazorpayButton
                customer={{
                  name: fullName,
                  email,
                  phone,
                }}
                shipping={{
                  addressLine1,
                  addressLine2,
                  city,
                  state,
                  postalCode,
                }}
                disabled={!isValid}
              />

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <ShieldCheck size={16} />
                Secure encrypted checkout
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
