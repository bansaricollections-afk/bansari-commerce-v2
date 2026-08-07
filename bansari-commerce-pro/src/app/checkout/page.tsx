"use client";

import { useState, useRef, useCallback, type FocusEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft } from "lucide-react";

import RazorpayButton from "@/components/checkout/RazorpayButton";
import CheckoutTrustStrip from "@/components/checkout/CheckoutTrustStrip";
import LuxuryStepIndicator from "@/components/checkout/LuxuryStepIndicator";
import { useCart, useCartHasHydrated } from "@/store/cart";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE   = /^\d{6}$/;

type Fields = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

function validate(fields: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (fields.fullName.trim().length < 2)
    errors.fullName = "Please enter your full name.";
  if (!PHONE_RE.test(fields.phone.trim()))
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!EMAIL_RE.test(fields.email.trim()))
    errors.email = "Enter a valid email address.";
  if (fields.addressLine1.trim().length < 5)
    errors.addressLine1 = "Enter your house/flat number and street.";
  if (fields.city.trim().length < 2)
    errors.city = "Enter your city.";
  if (fields.state.trim().length < 2)
    errors.state = "Enter your state.";
  if (!PIN_RE.test(fields.postalCode.trim()))
    errors.postalCode = "Enter a valid 6-digit PIN code.";
  return errors;
}

// ---------------------------------------------------------------------------
// CheckoutSkeleton
// Renders while Zustand persist is rehydrating from localStorage.
// Matches the visual weight of the real checkout grid to avoid layout shift.
// ---------------------------------------------------------------------------

function CheckoutSkeleton() {
  return (
    <div
      className="mt-8 grid gap-12 lg:grid-cols-[2fr_1fr]"
      aria-label="Loading checkout"
      aria-busy="true"
    >
      {/* Left column skeleton */}
      <div className="space-y-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-6 h-7 w-48 animate-pulse rounded-lg bg-slate-100" />
            <div className="grid gap-5">
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex flex-col gap-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right column skeleton */}
      <div className="sticky top-24 h-fit rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="space-y-4">
          {[1, 2, 3].map((r) => (
            <div key={r} className="flex justify-between">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="mt-10 h-14 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  // hasHydrated is false on the server and during the initial client paint.
  // It becomes true once Zustand's onRehydrateStorage callback fires, meaning
  // localStorage has been read and items reflects the real persisted state.
  const hasHydrated = useCartHasHydrated();

  const subtotal = totalPrice();
  const shipping = subtotal >= 2999 ? 0 : 99;
  const total    = subtotal + shipping;

  const [fields, setFields] = useState<Fields>({
    fullName:     "",
    phone:        "",
    email:        "",
    addressLine1: "",
    addressLine2: "",
    city:         "",
    state:        "",
    postalCode:   "",
  });

  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});

  const errors      = validate(fields);
  const isValid     = Object.keys(errors).length === 0;
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  function setField(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleBlur(key: keyof Fields) {
    return (_: FocusEvent) =>
      setTouched((prev) => ({ ...prev, [key]: true }));
  }

  const handlePayAttempt = useCallback(() => {
    if (isValid) return;
    const allTouched = Object.fromEntries(
      (Object.keys(fields) as (keyof Fields)[]).map((k) => [k, true])
    ) as Record<keyof Fields, boolean>;
    setTouched(allTouched);
    setTimeout(() => firstErrorRef.current?.focus(), 0);
  }, [isValid, fields]);

  const firstErrorKey = (Object.keys(errors) as (keyof Fields)[]).find(
    (k) => errors[k]
  );

  function field(
    key: keyof Fields,
    label: string,
    type: string,
    opts: {
      placeholder?: string;
      autoComplete?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    } = {}
  ) {
    const error        = touched[key] ? errors[key] : undefined;
    const id           = `checkout-${key}`;
    const errId        = `${id}-err`;
    const isFirstError = key === firstErrorKey;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500"
        >
          {label}
          <span className="ml-0.5 text-[#8A5A6A]" aria-hidden="true">*</span>
        </label>
        <input
          id={id}
          ref={isFirstError ? (el) => { firstErrorRef.current = el; } : undefined}
          type={type}
          value={fields[key]}
          onChange={setField(key)}
          onBlur={handleBlur(key)}
          placeholder={opts.placeholder ?? label}
          autoComplete={opts.autoComplete}
          inputMode={opts.inputMode}
          aria-required="true"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errId : undefined}
          className={`rounded-xl border p-4 text-sm outline-none transition-colors duration-150 focus:border-[#8A5A6A] focus:ring-1 focus:ring-[#8A5A6A]/30 ${
            error ? "border-rose-400 bg-rose-50/30" : "border-slate-200 bg-white"
          }`}
        />
        {error && (
          <p id={errId} role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-[#FFFDF9]" id="main-content">
        <div className="mx-auto max-w-7xl px-6 py-16">

          <Link
            href="/cart"
            className="mb-10 inline-flex items-center gap-2 text-[#8A5A6A] transition hover:underline focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back to Cart
          </Link>

          <h1 className="mb-4 font-[family:var(--font-playfair)] text-5xl font-bold">
            Secure Checkout
          </h1>

          <LuxuryStepIndicator currentStep={1} />

          {/*
            Hydration gate:
            - !hasHydrated  → Zustand persist hasn't read localStorage yet.
                              Render skeleton. Both SSR and initial client
                              paint agree on this branch → zero mismatch.
            - hasHydrated && items.length === 0 → cart is genuinely empty.
            - hasHydrated && items.length > 0   → render full checkout grid.
          */}
          {!hasHydrated ? (
            <CheckoutSkeleton />
          ) : items.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              <p className="text-lg text-slate-500">Your cart is empty.</p>
              <Link
                href="/shop"
                className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8A5A6A] underline underline-offset-4"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">

              {/* LEFT — Form */}
              <div className="space-y-8">
                <section aria-labelledby="section-contact" className="rounded-3xl bg-white p-8 shadow-sm">
                  <h2 id="section-contact" className="mb-6 text-2xl font-semibold">Contact Information</h2>
                  <div className="grid gap-5">
                    {field("fullName",     "Full Name",      "text",  { autoComplete: "name" })}
                    {field("phone",        "Mobile Number",  "tel",   { autoComplete: "tel", inputMode: "numeric", placeholder: "10-digit mobile" })}
                    {field("email",        "Email Address",  "email", { autoComplete: "email" })}
                  </div>
                </section>

                <section aria-labelledby="section-address" className="rounded-3xl bg-white p-8 shadow-sm">
                  <h2 id="section-address" className="mb-6 text-2xl font-semibold">Delivery Address</h2>
                  <div className="grid gap-5">
                    {field("addressLine1", "House / Flat No.", "text", { autoComplete: "address-line1" })}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="checkout-addressLine2"
                        className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500"
                      >
                        Street / Area
                        <span className="ml-0.5 text-slate-400 font-normal normal-case tracking-normal">&nbsp;(optional)</span>
                      </label>
                      <input
                        id="checkout-addressLine2"
                        type="text"
                        value={fields.addressLine2}
                        onChange={setField("addressLine2")}
                        placeholder="Street / Area"
                        autoComplete="address-line2"
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-colors duration-150 focus:border-[#8A5A6A] focus:ring-1 focus:ring-[#8A5A6A]/30"
                      />
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      {field("city",       "City",   "text", { autoComplete: "address-level2" })}
                      {field("state",      "State",  "text", { autoComplete: "address-level1" })}
                    </div>
                    {field("postalCode",   "PIN Code", "text", { autoComplete: "postal-code", inputMode: "numeric", placeholder: "6-digit PIN" })}
                  </div>
                </section>

                <section aria-labelledby="section-payment" className="rounded-3xl bg-white p-8 shadow-sm">
                  <fieldset>
                    <legend id="section-payment" className="mb-6 text-2xl font-semibold">Payment Method</legend>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#8A5A6A]/40">
                      <input type="radio" name="payment" defaultChecked className="accent-[#8A5A6A]" />
                      <span className="text-sm text-slate-700">
                        Razorpay — UPI / Credit Card / Debit Card / Net Banking
                      </span>
                    </label>
                  </fieldset>
                </section>
              </div>

              {/* RIGHT — Order summary */}
              <aside
                aria-labelledby="summary-heading"
                className="sticky top-24 h-fit rounded-3xl bg-white p-8 shadow-sm"
              >
                <h2 id="summary-heading" className="mb-8 text-3xl font-bold">Order Summary</h2>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.name} &times; {item.quantity}</span>
                      <span className="tabular-nums font-medium">
                        &#x20B9;{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}

                  <div aria-hidden="true" className="border-t border-slate-100" />

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="tabular-nums">&#x20B9;{subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Shipping</span>
                    <span className="tabular-nums font-medium">
                      {shipping === 0
                        ? <span className="text-emerald-600 font-semibold">FREE</span>
                        : `\u20b9${shipping.toLocaleString("en-IN")}`}
                    </span>
                  </div>

                  <div aria-hidden="true" className="border-t border-slate-100" />

                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">&#x20B9;{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div onClick={handlePayAttempt}>
                  <RazorpayButton
                    customer={{
                      name:  fields.fullName,
                      email: fields.email,
                      phone: fields.phone,
                    }}
                    shipping={{
                      name:         fields.fullName,
                      phone:        fields.phone,
                      addressLine1: fields.addressLine1,
                      addressLine2: fields.addressLine2,
                      city:         fields.city,
                      state:        fields.state,
                      postalCode:   fields.postalCode,
                    }}
                    disabled={!isValid}
                  />
                </div>

                <CheckoutTrustStrip />
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
