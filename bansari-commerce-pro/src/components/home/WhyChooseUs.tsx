/* ------------------------------------------------------------------
   WHYCHOOSEUS — LUXURY EDITORIAL PROMISE BAND v2
   Benchmark: Massimo Dutti editorial / COS typographic restraint

   Design decision
   ───────────────
   The previous 2×2 / 4-col identical promise card grid is the single
   most "template" section on the homepage. Every mid-market Shopify
   store uses it. Premium brands (Massimo Dutti, COS, Net-a-Porter)
   do not — they use typographic composition and whitespace.

   New layout: dark section (visual rhythm break between cream sections)
   ─── LEFT ──────────────────────────────────────────────────────────
   Oversized editorial numeral (01–04) as a typographic counterweight
   Gold hairline rule above each
   Label in tracked uppercase
   Detail line in muted inter

   ─── RIGHT ─────────────────────────────────────────────────────────
   Section eyebrow
   Playfair editorial heading (large)
   Long form paragraph — the brand's voice, not a bullet list
   Ghost CTA link

   Colour: --bc-surface-dark background — breaks the cream monotony
   that otherwise runs hero → category → products without contrast.
------------------------------------------------------------------ */

import Link from "next/link";

const promises = [
  {
    numeral: "01",
    label: "Handpicked Designs",
    detail: "Every piece curated for timeless elegance and modern Indian wear.",
  },
  {
    numeral: "02",
    label: "Premium Craftsmanship",
    detail: "Fine fabrics, detailed embroidery and quality finishing throughout.",
  },
  {
    numeral: "03",
    label: "Trusted Shopping",
    detail: "Secure payments, transparent policies and dependable support.",
  },
  {
    numeral: "04",
    label: "Careful Delivery",
    detail: "Reliable shipping with beautiful packaging, delivered PAN India.",
  },
] as const;

export default function WhyChooseUs() {
  return (
    <section
      aria-label="The Bansari Promise"
      style={{
        backgroundColor: "var(--bc-surface-dark)",
        paddingBlock: "var(--bc-section-padding)",
      }}
    >
      <div
        className="bc-promise__grid mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >

        {/* ── LEFT: numeral promise list ── */}
        <div className="bc-promise__left">
          <ol
            aria-label="Our commitments"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {promises.map(({ numeral, label, detail }, i) => (
              <li
                key={numeral}
                style={{
                  borderTop: "1px solid var(--bc-border-dark)",
                  paddingTop: "var(--bc-space-5)",
                  paddingBottom: i === promises.length - 1 ? 0 : "var(--bc-space-5)",
                  display: "grid",
                  gridTemplateColumns: "3rem 1fr",
                  gap: "var(--bc-space-5)",
                  alignItems: "start",
                }}
              >
                {/* Numeral */}
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: "var(--bc-text-sm)",
                    fontWeight: 400,
                    color: "var(--bc-text-gold)",
                    letterSpacing: "0.06em",
                    paddingTop: "0.15em",
                  }}
                >
                  {numeral}
                </span>
                {/* Content */}
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "var(--bc-text-xs)",
                      fontWeight: 500,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--bc-text-inverse)",
                      marginBottom: "var(--bc-space-1)",
                      opacity: 0.9,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "var(--bc-text-sm)",
                      color: "var(--bc-text-inverse)",
                      opacity: 0.48,
                      lineHeight: 1.7,
                      maxWidth: "30ch",
                    }}
                  >
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── RIGHT: editorial statement ── */}
        <div className="bc-promise__right">
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-5)",
            }}
          >
            The Bansari Promise
          </p>

          <h2
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "var(--bc-text-2xl)",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              color: "var(--bc-text-inverse)",
              marginBottom: "var(--bc-space-8)",
            }}
          >
            Every piece is a quiet
            <br />
            <em style={{ fontStyle: "italic" }}>act of care.</em>
          </h2>

          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-base)",
              lineHeight: 1.8,
              color: "var(--bc-text-inverse)",
              opacity: 0.6,
              maxWidth: "44ch",
              marginBottom: "var(--bc-space-10)",
            }}
          >
            We founded Bansari Collections with a single conviction — that
            Indian ethnic wear deserves the same reverence as any luxury
            fashion house. Every fabric, every embroidery detail, every
            delivery is treated as an extension of that belief.
          </p>

          <Link
            href="/about"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-text-gold)",
              borderBottom: "1px solid var(--bc-gold-dark)",
              paddingBottom: "2px",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--bc-space-1)",
              transition: "opacity var(--bc-transition-base)",
            }}
          >
            Our story →
          </Link>
        </div>

      </div>

      {/* ── Responsive grid ── */}
      <style>{`
        .bc-promise__grid {
          display: grid;
          gap: var(--bc-space-16);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .bc-promise__grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--bc-space-24);
            align-items: start;
          }
        }
        .bc-promise__right {
          padding-top: var(--bc-space-2);
        }
        @media (min-width: 1024px) {
          .bc-promise__right {
            position: sticky;
            top: calc(var(--bc-announcement-h) + 5rem);
          }
        }
      `}</style>
    </section>
  );
}
