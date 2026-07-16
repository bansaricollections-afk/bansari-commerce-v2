"use client";

type Props = {
  totalAmount: number;
};

const FREE_SHIPPING_THRESHOLD = 2999;

/**
 * ShippingProgress — shows how close the cart is to free shipping.
 * Fully client-side, no API calls.
 */
export default function ShippingProgress({ totalAmount }: Props) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalAmount);
  const percent = Math.min(100, (totalAmount / FREE_SHIPPING_THRESHOLD) * 100);
  const achieved = totalAmount >= FREE_SHIPPING_THRESHOLD;

  return (
    <div
      style={{
        padding: "var(--bc-space-4) var(--bc-space-5)",
        backgroundColor: "var(--bc-surface-warm)",
        borderBottom: "1px solid var(--bc-border-soft)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "var(--bc-text-xs)",
          fontWeight: 500,
          color: achieved ? "var(--bc-brand-mauve)" : "var(--bc-text-secondary)",
          marginBottom: "var(--bc-space-2)",
        }}
      >
        {achieved
          ? "✓ You qualify for free shipping!"
          : `Add \u20b9${remaining.toLocaleString("en-IN")} more for free shipping`}
      </p>

      {/* Track */}
      <div
        aria-hidden="true"
        style={{
          height: "3px",
          backgroundColor: "var(--bc-border-soft)",
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            backgroundColor: achieved ? "var(--bc-brand-mauve)" : "var(--bc-text-secondary)",
            transition: "width 500ms ease",
          }}
        />
      </div>
    </div>
  );
}
