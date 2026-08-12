import NewsletterForm from "@/components/home/NewsletterForm";

const BENEFITS = [
  { label: "New Arrivals", detail: "First to know" },
  { label: "Private Launches", detail: "Members only" },
  { label: "Early Access", detail: "Before the world" },
  { label: "Restocks", detail: "When pieces return" },
];

export default function LuxuryNewsletter() {
  return (
    <section
      aria-label="Join Bansari Privé"
      style={{
        background: "var(--bc-dark)",
        padding: "clamp(4rem, 8vw, 8rem) 0",
        overflow: "hidden",
      }}
    >
      {/* Top rule */}
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
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(2.5rem, 6vw, 7rem)",
          alignItems: "center",
        }}
        className="bc-nl-layout"
      >
        {/* ── Left: editorial copy ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Label */}
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
              Bansari Privé
            </span>
          </div>

          {/* Headline */}
          <h2
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: "clamp(2rem, 3.5vw, 4rem)",
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "var(--bc-cream)",
              margin: 0,
            }}
          >
            Be the first to
            <br />
            discover{" "}
            <em style={{ fontStyle: "italic", color: "var(--bc-gold-light)" }}>
              every
            </em>
            <br />
            collection.
          </h2>

          {/* Body */}
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(0.9375rem, 1.1vw, 1.0625rem)",
              lineHeight: 1.75,
              color: "rgba(255,253,249,0.55)",
              fontWeight: 300,
              margin: 0,
              maxWidth: "44ch",
            }}
          >
            Join Bansari Privé and step inside an inner circle that gets exclusive early access, private launches, festive edits, and member-only styling offers — before anyone else.
          </p>

          {/* Benefit rows */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              background: "rgba(200,165,110,0.1)",
              border: "1px solid rgba(200,165,110,0.1)",
              marginTop: "0.5rem",
            }}
          >
            {BENEFITS.map((b) => (
              <div
                key={b.label}
                style={{
                  background: "var(--bc-dark)",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--bc-cream)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {b.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "0.6875rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,253,249,0.35)",
                  }}
                >
                  {b.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: form island ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
          }}
        >
          {/* Decorative serif pull-quote */}
          <p
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(1.125rem, 1.5vw, 1.5rem)",
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.55,
              color: "rgba(255,253,249,0.4)",
              margin: 0,
              borderLeft: "2px solid rgba(200,165,110,0.3)",
              paddingLeft: "1.25rem",
            }}
          >
            &ldquo;The most beautiful Indian fashion, delivered to those who care most about it.&rdquo;
          </p>

          {/* Client island */}
          <NewsletterForm />

          {/* Trust line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid rgba(200,165,110,0.1)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 1l1.08 3.29H10.5L7.71 6.4l1.08 3.3L6 7.6l-2.79 2.1 1.08-3.3L1.5 4.29H4.92L6 1z"
                stroke="rgba(200,165,110,0.5)"
                strokeWidth="0.75"
                fill="none"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,253,249,0.25)",
              }}
            >
              Zero spam · Unsubscribe anytime
            </span>
          </div>
        </div>
      </div>

      {/* Bottom rule */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(200,165,110,0.25), transparent)",
          marginTop: "clamp(3rem, 5vw, 5rem)",
        }}
      />

      <style>{`
        @media (max-width: 900px) {
          .bc-nl-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
