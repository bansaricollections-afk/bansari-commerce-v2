"use client";

import { useEffect, useState } from "react";

type FeaturedCoupon = {
  code: string;
  description: string | null;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrder: number;
};

/**
 * Promotes the currently valid coupon, or renders nothing.
 *
 * Never hardcodes a code. The offer comes from /api/coupons/featured, which
 * derives it live from the coupons table, so a banner cannot advertise a code
 * that has expired or hit its usage limit. Meeting "invalid coupon" at the
 * moment of payment is worse than never seeing the offer at all.
 *
 * `subtotal` is optional. When supplied (cart, checkout) and the cart falls
 * short of min_order, the banner states what is still needed rather than
 * dangling a code the customer cannot use yet.
 *
 * Gold is used as a signal here, not a fill — per the design system it marks
 * premium moments and must never become a large background.
 */
export default function CouponBanner({
  subtotal,
  variant = "inline",
}: {
  subtotal?: number;
  variant?: "inline" | "compact";
}) {
  const [coupon, setCoupon] = useState<FeaturedCoupon | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/coupons/featured")
      .then((r) => r.json())
      .then((j) => {
        if (alive) setCoupon(j.coupon ?? null);
      })
      .catch(() => {
        // A promotional banner must never surface an error to a shopper.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!coupon) return null;

  const offer =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% off`
      : `₹${coupon.discountValue.toLocaleString("en-IN")} off`;

  const shortfall =
    typeof subtotal === "number" && subtotal < coupon.minOrder
      ? coupon.minOrder - subtotal
      : 0;

  if (variant === "compact") {
    return (
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "var(--bc-text-xs)",
          letterSpacing: "0.04em",
          color: "var(--bc-text-mid)",
        }}
      >
        {offer} with{" "}
        <span style={{ fontWeight: 600, color: "var(--bc-gold-dark)" }}>
          {coupon.code}
        </span>
      </p>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--bc-border-gold)",
        background: "var(--bc-gold-faint)",
        padding: "var(--bc-space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <p
        className="font-[family:var(--font-playfair)]"
        style={{ fontSize: "var(--bc-text-base)", color: "var(--bc-text-ink)" }}
      >
        {offer} with{" "}
        <span style={{ letterSpacing: "0.08em", fontWeight: 700 }}>{coupon.code}</span>
      </p>

      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "var(--bc-text-xs)",
          color: "var(--bc-text-muted)",
        }}
      >
        {shortfall > 0
          ? `Add ₹${shortfall.toLocaleString("en-IN")} more to use this offer.`
          : coupon.description
            ? coupon.description
            : "Apply at checkout."}
      </p>
    </div>
  );
}
