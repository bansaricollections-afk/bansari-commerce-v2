import Image from "next/image";
import Link from "next/link";

interface Occasion {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  image: string;
  size: "hero" | "tall" | "short" | "wide";
}

const OCCASIONS: Occasion[] = [
  {
    id: "wedding",
    name: "Wedding",
    subtitle: "Bridal & trousseau",
    href: "/collections/wedding",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=85&auto=format&fit=crop",
    size: "hero",
  },
  {
    id: "festive",
    name: "Festive",
    subtitle: "Diwali to Eid",
    href: "/collections/festive",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=700&q=80&auto=format&fit=crop",
    size: "tall",
  },
  {
    id: "puja",
    name: "Puja & Temple",
    subtitle: "Graceful devotion",
    href: "/collections/puja",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&q=80&auto=format&fit=crop",
    size: "short",
  },
  {
    id: "party",
    name: "Cocktail & Party",
    subtitle: "Glamour after dark",
    href: "/collections/party",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=700&q=80&auto=format&fit=crop",
    size: "short",
  },
  {
    id: "office",
    name: "Office",
    subtitle: "Power dressing",
    href: "/collections/office-wear",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=700&q=80&auto=format&fit=crop",
    size: "wide",
  },
];

export default function OccasionEdit() {
  return (
    <section
      aria-labelledby="occasion-heading"
      style={{
        background: "var(--bc-dark)",
        padding: "var(--bc-section) var(--bc-gutter)",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "var(--bc-wide)", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(2.5rem, 4vw, 4rem)",
            gap: "2rem",
          }}
        >
          <div>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--bc-gold)",
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              <span style={{ display: "block", width: "2rem", height: "1px", background: "var(--bc-gold)" }} />
              The Occasion Edit
            </span>
            <h2
              id="occasion-heading"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
                fontWeight: 500,
                color: "var(--bc-cream)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Dressed for
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--bc-gold-light)" }}>Every Moment</em>
            </h2>
          </div>
          <Link
            href="/shop"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-gold)",
              fontWeight: 500,
              borderBottom: "1px solid var(--bc-gold)",
              paddingBottom: "0.125rem",
              whiteSpace: "nowrap",
            }}
          >
            All occasions
          </Link>
        </div>

        {/* Magazine collage */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "440px 300px",
            gap: "8px",
          }}
        >
          {/* Hero — wedding */}
          <OccasionTile
            occ={OCCASIONS[0]}
            style={{ gridColumn: "1 / 6", gridRow: "1 / 3" }}
          />
          {/* Festive */}
          <OccasionTile
            occ={OCCASIONS[1]}
            style={{ gridColumn: "6 / 9", gridRow: "1 / 2" }}
          />
          {/* Puja */}
          <OccasionTile
            occ={OCCASIONS[2]}
            style={{ gridColumn: "9 / 13", gridRow: "1 / 2" }}
          />
          {/* Party */}
          <OccasionTile
            occ={OCCASIONS[3]}
            style={{ gridColumn: "6 / 9", gridRow: "2 / 3" }}
          />
          {/* Office */}
          <OccasionTile
            occ={OCCASIONS[4]}
            style={{ gridColumn: "9 / 13", gridRow: "2 / 3" }}
          />
        </div>

        <style>{`
          @media (max-width: 900px) {
            .bc-occ-grid { display: flex !important; overflow-x: auto; gap: 8px !important; scrollbar-width: none; }
            .bc-occ-grid::-webkit-scrollbar { display: none; }
            .bc-occ-grid > * { grid-column: unset !important; grid-row: unset !important; min-width: 220px; height: 320px; flex-shrink: 0; }
          }
        `}</style>
      </div>
    </section>
  );
}

function OccasionTile({ occ, style }: { occ: Occasion; style?: React.CSSProperties }) {
  return (
    <Link
      href={occ.href}
      style={{
        display: "block",
        position: "relative",
        overflow: "hidden",
        background: "var(--bc-dark-mid)",
        ...style,
      }}
      aria-label={`Shop ${occ.name}`}
    >
      <Image
        src={occ.image}
        alt={occ.name}
        fill
        sizes="(max-width: 900px) 220px, 35vw"
        style={{
          objectFit: "cover",
          objectPosition: "center top",
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
          opacity: 0.75,
        }}
        className="bc-occ-img"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(26,15,22,0.90) 0%, rgba(26,15,22,0.20) 60%, transparent 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "1.75rem 1.5rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.5625rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--bc-gold)",
            margin: "0 0 0.3rem",
            fontWeight: 500,
          }}
        >
          {occ.subtitle}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(1.125rem, 2vw, 1.75rem)",
            fontWeight: 500,
            color: "var(--bc-cream)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {occ.name}
        </h3>
      </div>

      <style>{`
        a:hover .bc-occ-img { transform: scale(1.06); opacity: 0.9; }
      `}</style>
    </Link>
  );
}
