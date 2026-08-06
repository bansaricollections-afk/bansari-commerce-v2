import Image from "next/image";
import Link from "next/link";

interface FeaturedCollection {
  id: string;
  tag: string;
  title: string;
  italic: string;
  body: string;
  cta: string;
  href: string;
  image: string;
  reverse?: boolean;
  bg: string;
}

const FEATURED: FeaturedCollection[] = [
  {
    id: "bridal",
    tag: "Bridal Edit 2024",
    title: "The Wedding",
    italic: "Collection",
    body: "From intimate mehendi ceremonies to the grand wedding night — our bridal lehengas, sarees and trousseau pieces are crafted to be heirlooms. Every thread carries the memory of a lifetime.",
    cta: "Explore Bridal",
    href: "/collections/bridal",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=85&auto=format&fit=crop",
    reverse: false,
    bg: "var(--bc-cream)",
  },
  {
    id: "festive",
    tag: "Season Favourites",
    title: "Festive",
    italic: "Splendour",
    body: "India celebrates in colour. Our festive edit brings together the richest embroideries, the most vivid silks, and the most beloved silhouettes — curated to make you the celebration.",
    cta: "Shop Festive",
    href: "/collections/festive",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&q=85&auto=format&fit=crop",
    reverse: true,
    bg: "var(--bc-sand)",
  },
  {
    id: "everyday",
    tag: "Daily Essentials",
    title: "Everyday",
    italic: "Elegance",
    body: "Handloom cotton, lightweight linen, breathable khadi — our everyday edit is designed for the woman who carries her culture with ease. Beautiful for boardrooms, markets, and everything between.",
    cta: "Shop Daily Wear",
    href: "/collections/daily-wear",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=900&q=85&auto=format&fit=crop",
    reverse: false,
    bg: "var(--bc-blush)",
  },
];

export default function FeaturedCollections() {
  return (
    <div aria-labelledby="featured-heading">
      {FEATURED.map((col, i) => (
        <FeaturedPanel key={col.id} col={col} index={i} />
      ))}
    </div>
  );
}

function FeaturedPanel({ col, index }: { col: FeaturedCollection; index: number }) {
  return (
    <section
      style={{
        background: col.bg,
        padding: "0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: col.reverse ? "1fr 1fr" : "1fr 1fr",
          minHeight: "clamp(520px, 70vh, 800px)",
        }}
      >
        {/* Image */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            order: col.reverse ? 2 : 1,
          }}
        >
          <Image
            src={col.image}
            alt={col.title}
            fill
            sizes="50vw"
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              transition: "transform 800ms cubic-bezier(0.16,1,0.3,1)",
            }}
            className="bc-feat-img"
          />
          <style>{`.bc-feat-img:hover { transform: scale(1.04); }`}</style>

          {/* Issue number — editorial detail */}
          <span
            style={{
              position: "absolute",
              bottom: "2rem",
              left: col.reverse ? "auto" : "2rem",
              right: col.reverse ? "2rem" : "auto",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,253,249,0.5)",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            No. {String(index + 1).padStart(2, "0")} / 03
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            order: col.reverse ? 1 : 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(3rem, 8vw, 7rem) clamp(2.5rem, 6vw, 5rem)",
            gap: "1.75rem",
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
                color: "var(--bc-gold-dark)",
                marginBottom: "1.25rem",
                fontWeight: 500,
              }}
            >
              <span style={{ display: "block", width: "2rem", height: "1px", background: "var(--bc-gold)" }} />
              {col.tag}
            </span>

            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(2.5rem, 4.5vw, 5rem)",
                fontWeight: 500,
                color: "var(--bc-text-ink)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              {col.title}
              <br />
              <em
                style={{
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--bc-brand-mauve)",
                }}
              >
                {col.italic}
              </em>
            </h2>
          </div>

          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(0.9375rem, 1vw, 1.0625rem)",
              lineHeight: 1.75,
              color: "var(--bc-text-mid)",
              fontWeight: 300,
              maxWidth: "42ch",
              margin: 0,
            }}
          >
            {col.body}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link
              href={col.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.75rem",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--bc-cream)",
                background: "var(--bc-brand-plum)",
                padding: "0.9375rem 2.25rem",
                transition: "all var(--bc-base-t)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bc-brand-mauve)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bc-brand-plum)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {col.cta}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile: stack */}
      <style>{`
        @media (max-width: 768px) {
          .bc-feat-panel > div { grid-template-columns: 1fr !important; }
          .bc-feat-panel [style*="order: 1"] { min-height: 360px; }
        }
      `}</style>
    </section>
  );
}
