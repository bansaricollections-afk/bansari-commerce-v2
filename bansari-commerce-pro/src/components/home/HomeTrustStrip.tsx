/**
 * HomeTrustStrip — full-width luxury trust signals bar.
 * Placed immediately below the Hero on the homepage.
 * Static — no external data dependencies.
 */

const TRUST_ITEMS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    label: "Free Shipping",
    sub: "On orders above ₹2,999",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: "Secure Payments",
    sub: "Razorpay encrypted checkout",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    label: "Easy Returns",
    sub: "7-day hassle-free returns",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    ),
    label: "Handcrafted Quality",
    sub: "Artisan-made, ethically sourced",
  },
];

export default function HomeTrustStrip() {
  return (
    <section
      aria-label="Trust signals"
      style={{
        backgroundColor: "var(--bc-surface-warm)",
        borderTop: "1px solid var(--bc-border-soft)",
        borderBottom: "1px solid var(--bc-border-soft)",
        paddingBlock: "var(--bc-space-6)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        <ul
          role="list"
          className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
        >
          {TRUST_ITEMS.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3"
            >
              <span
                style={{ color: "var(--bc-text-gold)", flexShrink: 0 }}
              >
                {item.icon}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "var(--bc-text-xs)",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--bc-text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "var(--bc-text-xs)",
                    color: "var(--bc-text-muted)",
                    lineHeight: 1.4,
                    marginTop: "1px",
                  }}
                >
                  {item.sub}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
