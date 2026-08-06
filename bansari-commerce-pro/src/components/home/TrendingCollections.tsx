import Link from "next/link";
import Image from "next/image";

interface Collection {
  id: string;
  name: string;
  desc: string;
  tag: string;
  href: string;
  image: string;
  color: string;
}

const COLLECTIONS: Collection[] = [
  {
    id: "wedding",
    name: "Wedding",
    desc: "Bridal lehengas, shaadiwali sarees & occasion wear",
    tag: "Most Loved",
    href: "/collections/wedding",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&q=80&auto=format&fit=crop",
    color: "#3D2535",
  },
  {
    id: "festive",
    name: "Festive",
    desc: "Diwali, Navratri & celebration-ready ethnic wear",
    tag: "New Season",
    href: "/collections/festive",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=700&q=80&auto=format&fit=crop",
    color: "#5C3A4F",
  },
  {
    id: "office",
    name: "Office Wear",
    desc: "Refined kurtas & co-ord sets for the modern professional",
    tag: "Bestseller",
    href: "/collections/office-wear",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=700&q=80&auto=format&fit=crop",
    color: "#2C1A24",
  },
  {
    id: "daily",
    name: "Daily Wear",
    desc: "Easy cotton, linen & khadi for everyday Indian living",
    tag: "Everyday",
    href: "/collections/daily-wear",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&q=80&auto=format&fit=crop",
    color: "#4B3A43",
  },
  {
    id: "party",
    name: "Party",
    desc: "Glamorous ensembles that command every room",
    tag: "Editor's Pick",
    href: "/collections/party",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=700&q=80&auto=format&fit=crop",
    color: "#714857",
  },
  {
    id: "vacation",
    name: "Vacation",
    desc: "Breezy silks, printed cotton & resort-ready ethnic",
    tag: "Summer Edit",
    href: "/collections/vacation",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&q=80&auto=format&fit=crop&facepad=2",
    color: "#8A5A6A",
  },
];

export default function TrendingCollections() {
  return (
    <section
      aria-labelledby="trending-heading"
      style={{
        background: "var(--bc-sand)",
        padding: "var(--bc-section) var(--bc-gutter)",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "var(--bc-wide)", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "flex-end",
            marginBottom: "clamp(2.5rem, 4vw, 4rem)",
            gap: "2rem",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--bc-gold-dark)",
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              Trending Now
            </span>
            <h2
              id="trending-heading"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
                fontWeight: 500,
                color: "var(--bc-text-ink)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Shop by
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 400 }}>Collection</em>
            </h2>
          </div>
          <Link
            href="/collections"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-brand-mauve)",
              fontWeight: 500,
              borderBottom: "1px solid var(--bc-brand-mauve)",
              paddingBottom: "0.125rem",
              whiteSpace: "nowrap",
            }}
          >
            All collections
          </Link>
        </div>

        {/* Collection tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "12px",
          }}
        >
          {COLLECTIONS.map((col, i) => (
            <CollectionTile key={col.id} col={col} large={i === 0 || i === 5} />
          ))}
        </div>

        <style>{`
          @media (max-width: 1100px) {
            .bc-trend-grid { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .bc-trend-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function CollectionTile({ col, large }: { col: Collection; large?: boolean }) {
  return (
    <Link
      href={col.href}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        aspectRatio: large ? "2/3" : "3/4",
        background: col.color,
        cursor: "pointer",
      }}
      aria-label={`${col.name} collection`}
    >
      <Image
        src={col.image}
        alt={col.name}
        fill
        sizes="(max-width: 640px) 50vw, 16vw"
        style={{
          objectFit: "cover",
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
          mixBlendMode: "multiply",
          opacity: 0.85,
        }}
        className="bc-trend-img"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${col.color}f0 0%, ${col.color}80 40%, transparent 100%)`,
        }}
      />

      {/* Tag */}
      <span
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "0.5625rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--bc-gold-light)",
          fontWeight: 600,
          background: "rgba(0,0,0,0.28)",
          padding: "0.25rem 0.625rem",
          backdropFilter: "blur(4px)",
        }}
      >
        {col.tag}
      </span>

      {/* Content */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "1.5rem 1.25rem",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: large ? "clamp(1.25rem, 2vw, 1.75rem)" : "clamp(1rem, 1.5vw, 1.375rem)",
            fontWeight: 500,
            color: "var(--bc-cream)",
            margin: "0 0 0.375rem",
            lineHeight: 1.1,
          }}
        >
          {col.name}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.75rem",
            color: "rgba(255,253,249,0.62)",
            margin: 0,
            lineHeight: 1.4,
            display: large ? "block" : "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {col.desc}
        </p>
      </div>

      <style>{`
        a:hover .bc-trend-img { transform: scale(1.05); }
      `}</style>
    </Link>
  );
}
