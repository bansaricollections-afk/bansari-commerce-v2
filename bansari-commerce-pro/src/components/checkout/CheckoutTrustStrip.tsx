const SIGNALS = [
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    text: "256-bit SSL Encryption",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    text: "Razorpay Secured",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M9 14l2 2 4-4" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
    text: "PCI DSS Compliant",
  },
];

/**
 * CheckoutTrustStrip — security trust signals for the checkout page.
 */
export default function CheckoutTrustStrip() {
  return (
    <div
      aria-label="Payment security"
      className="flex flex-wrap items-center justify-center gap-4"
      style={{
        paddingBlock: "var(--bc-space-5)",
        borderTop: "1px solid var(--bc-border-soft)",
        marginTop: "var(--bc-space-6)",
      }}
    >
      {SIGNALS.map((s) => (
        <span
          key={s.text}
          className="flex items-center gap-1.5"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-xs)",
            color: "var(--bc-text-muted)",
          }}
        >
          {s.icon}
          {s.text}
        </span>
      ))}
    </div>
  );
}
