const TESTIMONIALS = [
  {
    id: 1,
    name: "Priya Mehta",
    location: "Mumbai",
    occasion: "Wedding Guest",
    quote:
      "I wore Bansari to my cousin's wedding in Udaipur and received more compliments than the bride. The embroidery on the lehenga was unlike anything I had seen at this price point — truly heirloom quality.",
    initials: "PM",
    rating: 5,
  },
  {
    id: 2,
    name: "Ananya Krishnan",
    location: "Bengaluru",
    occasion: "Diwali Celebration",
    quote:
      "The Kanjivaram saree arrived beautifully packaged — tissue paper, wax seal, handwritten note. Before I even unfolded it I knew I was holding something special. The weave is extraordinary.",
    initials: "AK",
    rating: 5,
  },
  {
    id: 3,
    name: "Shreya Joshi",
    location: "Delhi",
    occasion: "Office & Everyday",
    quote:
      "Finally a brand that makes Indian wear feel effortless for daily wear. The cotton kurta set I ordered is so well-cut that I've now bought three more in different colours. The fit guidance was perfect.",
    initials: "SJ",
    rating: 5,
  },
  {
    id: 4,
    name: "Ritu Agarwal",
    location: "Jaipur",
    occasion: "Family Function",
    quote:
      "I was hesitant to order ethnic wear online but the detailed size guide and the team's response to my WhatsApp query within minutes gave me confidence. The anarkali is even more gorgeous in person.",
    initials: "RA",
    rating: 5,
  },
  {
    id: 5,
    name: "Kavya Nair",
    location: "Kochi",
    occasion: "Onam Special",
    quote:
      "The Kerala kasavu saree felt like it was made specifically for me. The golden border, the texture of the cotton, the way it drapes — Bansari clearly sources from people who truly understand their craft.",
    initials: "KN",
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: "0.25rem" }} aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1l1.35 2.74L10.5 4.2l-2.25 2.19.53 3.09L6 7.99l-2.78 1.49.53-3.09L1.5 4.2l3.15-.46L6 1z"
            fill="var(--bc-gold)"
          />
        </svg>
      ))}
    </div>
  );
}

export default function CustomerStories() {
  return (
    <section
      aria-label="Customer stories"
      style={{
        background: "var(--bc-dark)",
        padding: "clamp(4rem, 8vw, 8rem) 0",
        overflow: "hidden",
      }}
    >
      {/* ── Top rule ── */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(200,165,110,0.25), transparent)",
          marginBottom: "clamp(3rem, 5vw, 5rem)",
        }}
      />

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 clamp(1.25rem, 5vw, 5rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(2.5rem, 4vw, 4rem)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "2rem",
          }}
          className="bc-stories-header"
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
                  color: "var(--bc-gold-light)",
                  fontWeight: 500,
                }}
              >
                Real Women · Real Stories
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 3.5vw, 4rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--bc-cream)",
                margin: 0,
              }}
            >
              Dressed by Bansari,
              <br />
              <em style={{ fontStyle: "italic", color: "var(--bc-gold-light)" }}>Loved by Women</em>
            </h2>
          </div>

          {/* Trust metric */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.5rem",
              flexShrink: 0,
            }}
            className="bc-stories-metric"
          >
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1l1.35 2.74L10.5 4.2l-2.25 2.19.53 3.09L6 7.99l-2.78 1.49.53-3.09L1.5 4.2l3.15-.46L6 1z"
                    fill="var(--bc-gold)"
                  />
                </svg>
              ))}
            </div>
            <span
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: "clamp(1.5rem, 2vw, 2.25rem)",
                fontWeight: 500,
                color: "var(--bc-cream)",
                lineHeight: 1,
              }}
            >
              4.9
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,253,249,0.4)",
              }}
            >
              avg. from 2,400+ reviews
            </span>
          </div>
        </div>

        {/* ── Testimonial tiles ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5px",
            background: "rgba(200,165,110,0.12)",
          }}
          className="bc-stories-grid"
        >
          {TESTIMONIALS.slice(0, 3).map((t) => (
            <article
              key={t.id}
              style={{
                background: "var(--bc-dark)",
                padding: "clamp(1.75rem, 3vw, 2.75rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <StarRating count={t.rating} />
              <blockquote
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "clamp(0.9375rem, 1.1vw, 1.125rem)",
                  fontStyle: "italic",
                  lineHeight: 1.7,
                  color: "rgba(255,253,249,0.8)",
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  borderTop: "1px solid rgba(200,165,110,0.12)",
                  paddingTop: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: "rgba(200,165,110,0.15)",
                    border: "1px solid rgba(200,165,110,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      color: "var(--bc-gold-light)",
                    }}
                  >
                    {t.initials}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--bc-cream)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.6875rem",
                      color: "rgba(255,253,249,0.35)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t.location} · {t.occasion}
                  </span>
                </div>
              </footer>
            </article>
          ))}
        </div>

        {/* ── Second row: 2 wide testimonials ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5px",
            background: "rgba(200,165,110,0.12)",
          }}
          className="bc-stories-grid-2"
        >
          {TESTIMONIALS.slice(3).map((t) => (
            <article
              key={t.id}
              style={{
                background: "var(--bc-dark)",
                padding: "clamp(1.75rem, 3vw, 2.75rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <StarRating count={t.rating} />
              <blockquote
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "clamp(0.9375rem, 1.1vw, 1.125rem)",
                  fontStyle: "italic",
                  lineHeight: 1.7,
                  color: "rgba(255,253,249,0.8)",
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  borderTop: "1px solid rgba(200,165,110,0.12)",
                  paddingTop: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: "rgba(200,165,110,0.15)",
                    border: "1px solid rgba(200,165,110,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      color: "var(--bc-gold-light)",
                    }}
                  >
                    {t.initials}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--bc-cream)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "0.6875rem",
                      color: "rgba(255,253,249,0.35)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t.location} · {t.occasion}
                  </span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bc-stories-header { flex-direction: column; align-items: flex-start !important; }
          .bc-stories-metric { align-items: flex-start !important; }
          .bc-stories-grid { grid-template-columns: 1fr !important; }
          .bc-stories-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .bc-stories-grid { grid-template-columns: 1fr !important; }
          .bc-stories-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
