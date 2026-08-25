import Image from "next/image";
import Link from "next/link";

import { getFeaturedProducts } from "@/services/product.service";

export default async function CraftsmanshipStory() {
  // Real catalog imagery only — no stock photography. If no suitable real
  // product image exists, the image panel is omitted rather than padded.
  let storyImage: string | null = null;
  try {
    const featured = await getFeaturedProducts();
    storyImage = featured.find((p) => p.images?.[0]?.url)?.images?.[0]?.url ?? null;
  } catch {
    storyImage = null;
  }

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
          gridTemplateColumns: storyImage ? "1fr 1fr" : "1fr",
          minHeight: "clamp(500px, 65vw, 800px)",
        }}
        className="bc-craft-grid"
      >
        {/* ── Left: Image panel — real catalog imagery only ── */}
        {storyImage && (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "420px",
          }}
        >
          <Image
            src={storyImage}
            alt="Bansari Collections craftsmanship"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              objectFit: "cover",
              objectPosition: "center top",
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
              {/* Founding year removed: "Est. 2011" here contradicted
                  "Est. 2018" in the announcement bar and no authoritative
                  source exists in the project to settle it. */}
              {/* Vadodara, not Surat. This is the founding city and it must
                  match the Organization / ClothingStore JSON-LD in
                  app/layout.tsx, which gives addressLocality "Vadodara" and
                  addressRegion "Gujarat". The two disagreeing is a real SEO
                  problem: Google cross-checks on-page location against
                  structured data for local relevance. */}
              Vadodara, Gujarat
            </span>
          </div>
        </div>
        )}

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
              {/* The epithet changed with the city, deliberately. "The city of
                  silk" is Surat's — it is what Surat is actually known for —
                  so carrying it over to Vadodara would have replaced one
                  false claim with another. Vadodara is Gujarat's cultural
                  capital, so "culture" is the accurate substitution and keeps
                  the original cadence. */}
              Born in Vadodara — Gujarat&rsquo;s city of culture and celebration — Bansari Collection was founded on one belief: that every Indian woman deserves to wear something that tells her story.
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
