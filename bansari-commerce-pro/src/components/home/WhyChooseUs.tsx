// WhyChooseUs — Editorial Trust Band
// Batch 8 · Option B v2 · CTO-approved
//
// Layout
//   Desktop  : 4-column typography band, full-width within max-w-7xl
//   Mobile   : 2×2 grid (no snap-scroll, no icons, no cards)
//
// Tokens used (all from globals.css Sprint 6 block)
//   --bc-surface-cream   section background
//   --bc-border-soft     hairline top / bottom dividers
//   --bc-text-primary    heading colour
//   --bc-text-secondary  label colour
//   --bc-text-muted      supporting line colour
//   --bc-text-xs         label size
//   --bc-text-sm         supporting line size
//   --bc-text-lg         section heading size
//   --bc-space-*         padding / gap
//   --font-playfair      section heading
//   --font-inter         labels + body

const promises = [
  {
    label: "Handpicked Designs",
    detail: "Every piece curated for timeless elegance and modern Indian wear.",
  },
  {
    label: "Premium Craftsmanship",
    detail: "Fine fabrics, detailed embroidery and quality finishing throughout.",
  },
  {
    label: "Trusted Shopping",
    detail: "Secure payments, transparent policies and dependable support.",
  },
  {
    label: "Careful Delivery",
    detail: "Reliable shipping with beautiful packaging, delivered PAN India.",
  },
] as const;

export default function WhyChooseUs() {
  return (
    <section
      aria-label="The Bansari Promise"
      style={{
        backgroundColor: "var(--bc-surface-cream)",
        borderTop:    "1px solid var(--bc-border-soft)",
        borderBottom: "1px solid var(--bc-border-soft)",
        paddingBlock: "var(--bc-space-16)",
      }}
    >
      <div
        style={{
          maxWidth:      "var(--bc-content-wide)",
          marginInline:  "auto",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        {/* ── Editorial heading ── */}
        <p
          style={{
            fontFamily:    "var(--font-playfair), serif",
            fontSize:      "var(--bc-text-lg)",
            fontWeight:    500,
            color:         "var(--bc-text-primary)",
            letterSpacing: "0.04em",
            marginBottom:  "var(--bc-space-12)",
          }}
        >
          The Bansari Promise
        </p>

        {/* ── Trust band ── */}
        <dl
          aria-label="Brand commitments"
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(2, 1fr)",  /* mobile: 2-col */
            gap:                 "var(--bc-space-10) var(--bc-space-8)",
          }}
          className="bc-promise-grid"
        >
          {promises.map(({ label, detail }) => (
            <div key={label}>
              <dt
                style={{
                  fontFamily:    "var(--font-inter), sans-serif",
                  fontSize:      "var(--bc-text-xs)",
                  fontWeight:    600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color:         "var(--bc-text-secondary)",
                  marginBottom:  "var(--bc-space-2)",
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize:   "var(--bc-text-sm)",
                  color:      "var(--bc-text-muted)",
                  lineHeight: 1.65,
                  margin:     0,
                  maxWidth:   "34ch",
                }}
              >
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Responsive grid: 4-column on lg+ ── */}
      <style>{`
        @media (min-width: 1024px) {
          .bc-promise-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0 !important;
          }
          .bc-promise-grid > div {
            padding-inline: var(--bc-space-8);
            border-right: 1px solid var(--bc-border-soft);
          }
          .bc-promise-grid > div:first-child {
            padding-left: 0;
          }
          .bc-promise-grid > div:last-child {
            border-right: none;
            padding-right: 0;
          }
        }
      `}</style>
    </section>
  );
}
