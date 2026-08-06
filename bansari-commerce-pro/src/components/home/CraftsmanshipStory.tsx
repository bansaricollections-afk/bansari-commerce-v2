import Image from "next/image";
import Link from "next/link";

const STATS = [
  { value: "2011", label: "Est. in Surat" },
  { value: "500+", label: "Artisan families" },
  { value: "12", label: "Heritage crafts" },
  { value: "40k+", label: "Happy customers" },
];

export default function CraftsmanshipStory() {
  return (
    <section
      aria-label="Our craftsmanship story"
      style={{
        background: "var(--bc-dark)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Top rule ── */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(200,165,110,0.25), transparent)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "clamp(500px, 65vw, 800px)",
        }}
        className="bc-craft-grid"
      >
        {/* ── Left: Image panel ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "420px",
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&auto=format&fit=crop"
            alt="Artisan hands at work — Bansari Collection craftsmanship"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              objectFit: "cover",
              objectPosition: "center",
              transition: "transform 1.2s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
          {/* Overlay gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, transparent 60%, var(--bc-dark) 100%), " +
                "linear-gradient(to top, rgba(26,15,22,0.55) 0%, transparent 40%)",
            }}
          />
          {/* Est. chip */}
          <div
            style={{
              position: "absolute",
              top: "clamp(1.5rem, 3vw, 2.5rem)",
              left: "clamp(1.5rem, 3vw, 2.5rem)",
              background: "rgba(26,15,22,0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(200,165,110,0.25)",
              padding: "0.5rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: "var(--bc-gold)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.625rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--bc-gold-light)",
                fontWeight: 500,
              }}
            >
              Est. 2011 · Surat, India
            </span>
          </div>
        </div>

        {/* ── Right: Content ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(2.5rem, 6vw, 6rem)",
            gap: "2rem",
          }}
        >
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
              The Bansari Story
            </span>
          </div>

          {/* Headline */}
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
            Where Heritage
            <br />
            <em style={{ fontStyle: "italic", color: "var(--bc-gold-light)" }}>Meets</em> the
            <br />
            Modern Woman
          </h2>

          {/* Body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "clamp(0.9375rem, 1.1vw, 1.0625rem)",
                lineHeight: 1.75,
                color: "rgba(255,253,249,0.65)",
                fontWeight: 300,
                margin: 0,
              }}
            >
              Born in Surat — the city of silk and celebration — Bansari Collection was founded on one belief: that every Indian woman deserves to wear something that tells her story.
            </p>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "clamp(0.9375rem, 1.1vw, 1.0625rem)",
                lineHeight: 1.75,
                color: "rgba(255,253,249,0.65)",
                fontWeight: 300,
                margin: 0,
              }}
            >
              Every thread is chosen with intention. Every embroidery is the work of artisan hands that have practiced their craft across generations. We do not manufacture garments — we preserve living traditions.
            </p>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid rgba(200,165,110,0.15)",
              paddingTop: "1.75rem",
              gap: "1rem",
            }}
          >
            {STATS.map((s) => (
              <div key={s.value} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: "clamp(1.375rem, 2.2vw, 2rem)",
                    fontWeight: 500,
                    color: "var(--bc-gold-light)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "0.6875rem",
                    letterSpacing: "0.1em",
                    color: "rgba(255,253,249,0.4)",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div>
            <Link
              href="/about"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.625rem",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--bc-cream)",
                borderBottom: "1px solid rgba(255,253,249,0.35)",
                paddingBottom: "0.25rem",
                transition: "all var(--bc-base-t)",
              }}
            >
              Our full story
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom rule ── */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(200,165,110,0.25), transparent)",
        }}
      />

      <style>{`
        @media (max-width: 767px) {
          .bc-craft-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
