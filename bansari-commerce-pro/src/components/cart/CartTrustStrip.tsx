const SIGNALS = [
  "Secure Razorpay Checkout",
  "7-Day Easy Returns",
  "Handcrafted Guarantee",
];

/**
 * CartTrustStrip — compact trust signals inside the cart panel.
 * Static, no data deps.
 */
export default function CartTrustStrip() {
  return (
    <div
      aria-label="Trust signals"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
      style={{
        paddingBlock: "var(--bc-space-4)",
        borderTop: "1px solid var(--bc-border-soft)",
      }}
    >
      {SIGNALS.map((sig) => (
        <span
          key={sig}
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-xs)",
            color: "var(--bc-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {sig}
        </span>
      ))}
    </div>
  );
}
