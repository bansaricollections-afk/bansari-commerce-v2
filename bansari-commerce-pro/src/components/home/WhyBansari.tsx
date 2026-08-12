import Link from "next/link";

const PILLARS = [
  {
    number: "01",
    title: "Handcrafted with Intention",
    body: "Every piece is made by artisan hands, not on a mass-production line. We keep the catalogue small so each design gets the attention it deserves.",
    href: "/about",
  },
  {
    number: "02",
    title: "Fabrics We Stand Behind",
    body: "Every listing states its fabric and craft openly, so you know exactly what you are buying before you order.",
    href: "/collections",
  },
  {
    number: "03",
    title: "Sizing You Can Check First",
    body: "Size options and product measurements are published on every product page, and you can reach us on WhatsApp before you order.",
    href: "/contact",
  },
  {
    number: "04",
    title: "Delivered to Your Door",
    body: "We ship across India through our courier partners. Orders are dispatched within 1–2 business days, and tracking details reach you by SMS or email.",
    href: "/shipping-policy",
  },
  {
    number: "05",
    title: "Straightforward Returns",
    body: "If the piece does not feel right, our published 7-day return and refund policy applies. No forms. No friction. Just a direct conversation with our team.",
    href: "/return-refund-policy",
  },
  {
    number: "06",
    title: "Conscious Luxury",
    body: "We work with artisan families rather than factories. Every purchase sustains a living craft, a livelihood, and an unbroken chain of tradition.",
    href: "/about",
  },
];

export default function WhyBansari() {
  return (
    <section
      aria-label="Why choose Bansari Collection"
      style={{
        background: "var(--bc-cream)",
        padding: "clamp(4rem, 8vw, 8rem) clamp(1.25rem, 5vw, 5rem)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(3rem, 5vw, 5rem)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            alignItems: "end",
          }}
          className="bc-why-header"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                style={{
                  display: "block",
                  width: "2.5rem",
                  height: "1px",
                  background: "var(--bc-gold)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--bc-gold)",
                  fontWeight: 500,
                }}
              >
                The Bansari Promise
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 3.5vw, 4rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--bc-dark)",
                margin: 0,
              }}
            >
              Why Women Choose
              <br />
              <em style={{ fontStyle: "italic" }}>Bansari</em>
            </h2>
          </div>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(0.9375rem, 1.1vw, 1.0625rem)",
              lineHeight: 1.75,
              color: "rgba(26,15,22,0.6)",
              fontWeight: 300,
              margin: 0,
              maxWidth: "42ch",
              justifySelf: "end",
            }}
          >
            We exist for one reason: to let you wear the most beautiful version of Indian fashion, created with honesty, craft, and care.
          </p>
        </div>

        {/* ── Grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid rgba(26,15,22,0.1)",
          }}
          className="bc-why-grid"
        >
          {PILLARS.map((p, i) => (
            <div
              key={p.number}
              style={{
                borderRight: i % 3 !== 2 ? "1px solid rgba(26,15,22,0.1)" : "none",
                borderBottom: i < 3 ? "1px solid rgba(26,15,22,0.1)" : "none",
                padding: "clamp(1.5rem, 3vw, 2.5rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                transition: "background var(--bc-base-t)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--bc-gold)",
                  letterSpacing: "0.05em",
                }}
              >
                {p.number}
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "clamp(1rem, 1.4vw, 1.375rem)",
                  fontWeight: 500,
                  lineHeight: 1.25,
                  color: "var(--bc-dark)",
                  margin: 0,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.9375rem",
                  lineHeight: 1.65,
                  color: "rgba(26,15,22,0.6)",
                  fontWeight: 300,
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                {p.body}
              </p>
              <Link
                href={p.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--bc-dark)",
                  opacity: 0.55,
                  transition: "opacity var(--bc-base-t)",
                  width: "fit-content",
                }}
              >
                Learn more
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bc-why-header {
            grid-template-columns: 1fr !important;
          }
          .bc-why-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .bc-why-grid > div {
            border-right: none !important;
          }
          .bc-why-grid > div:nth-child(odd) {
            border-right: 1px solid rgba(26,15,22,0.1) !important;
          }
          .bc-why-grid > div:nth-child(n+5) {
            border-bottom: none !important;
          }
        }
        @media (max-width: 540px) {
          .bc-why-grid {
            grid-template-columns: 1fr !important;
          }
          .bc-why-grid > div {
            border-right: none !important;
            border-bottom: 1px solid rgba(26,15,22,0.1) !important;
          }
          .bc-why-grid > div:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  );
}
