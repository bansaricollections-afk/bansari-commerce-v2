/**
 * HomeTrustStrip v2 — elevated luxury trust signals.
 * Benchmark: Net-a-Porter · Aza Fashions · Sabyasachi.
 * Premium icon set, refined typography, hairline gold dividers.
 */

const TRUST_ITEMS = [
  {
    icon: (
      /* Courier ribbon — evokes a gift dispatch, not a directional arrow */
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
        <path d="M3 9l2-5h14l2 5" />
        <path d="M12 9v13" />
        <path d="M7 4c0 2 5 5 5 5s5-3 5-5" />
      </svg>
    ),
    label: "Complimentary Shipping",
    sub: "On orders above ₹2,999",
  },
  {
    icon: (
      /* Lock with subtle keyhole — security, not a generic shield */
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <path d="M12 17.2v1.8" />
      </svg>
    ),
    label: "Secure Checkout",
    sub: "Razorpay encrypted payments",
  },
  {
    icon: (
      /* Circular arrows — returns cycle, premium feel */
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    ),
    label: "Effortless Returns",
    sub: "7-day hassle-free policy",
  },
  {
    icon: (
      /* Needle + thread arc — craft, artisan, handwork */
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </svg>
    ),
    label: "Artisan Craftsmanship",
    sub: "Ethically sourced, handmade",
  },
];

export default function HomeTrustStrip() {
  return (
    <section
      aria-label="Trust signals"
      className="bc4-trust"
    >
      <div className="bc4-trust__inner">
        <ul role="list" className="bc4-trust__grid">
          {TRUST_ITEMS.map((item, i) => (
            <li key={item.label} className="bc4-trust__item">
              {/* Gold hairline divider between items — desktop */}
              {i > 0 && <span className="bc4-trust__divider" aria-hidden="true" />}
              <span className="bc4-trust__icon">{item.icon}</span>
              <div className="bc4-trust__text">
                <p className="bc4-trust__label">{item.label}</p>
                <p className="bc4-trust__sub">{item.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .bc4-trust {
          background-color: var(--bc-surface-warm);
          border-top: 1px solid var(--bc-border-gold);
          border-bottom: 1px solid var(--bc-border-gold);
          padding-block: var(--bc-space-8);
        }
        .bc4-trust__inner {
          max-width: var(--bc-content-wide);
          margin-inline: auto;
          padding-inline: var(--bc-gutter);
        }
        .bc4-trust__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--bc-space-6) var(--bc-space-4);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        @media (min-width: 640px) {
          .bc4-trust__grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0;
          }
        }
        .bc4-trust__item {
          display: flex;
          align-items: flex-start;
          gap: var(--bc-space-3);
          position: relative;
          padding-inline: var(--bc-space-4);
        }
        /* Remove left padding on first item */
        .bc4-trust__item:first-child {
          padding-left: 0;
        }
        @media (max-width: 639px) {
          .bc4-trust__item {
            padding-inline: 0;
          }
          .bc4-trust__divider {
            display: none;
          }
        }
        /* Vertical gold hairline divider */
        .bc4-trust__divider {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 1px;
          height: 2.5rem;
          background: var(--bc-border-gold);
          opacity: 0.4;
        }
        .bc4-trust__icon {
          color: var(--bc-gold-dark);
          flex-shrink: 0;
          margin-top: 2px;
          opacity: 0.9;
        }
        .bc4-trust__text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .bc4-trust__label {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          color: var(--bc-text-primary);
          line-height: 1.3;
          margin: 0;
        }
        .bc4-trust__sub {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.6875rem;
          font-weight: 400;
          color: var(--bc-text-muted);
          line-height: 1.45;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
