import Image from "next/image";
import Link from "next/link";

interface Category {
  name: string;
  label: string;
  description: string;
  href: string;
  image: string;
  span: "tall" | "wide" | "normal";
}

const CATEGORIES: Category[] = [
  {
    name: "Sarees",
    label: "The Saree Edit",
    description: "Timeless drapes from Bengal to Kanjivaram",
    href: "/shop?category=sarees",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&q=85&auto=format&fit=crop",
    span: "tall",
  },
  {
    name: "Lehengas",
    label: "Bridal Lehengas",
    description: "For the grandest occasions of your life",
    href: "/shop?category=lehengas",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=85&auto=format&fit=crop",
    span: "normal",
  },
  {
    name: "Kurta Sets",
    label: "Kurta & Sets",
    description: "Artisan embroidery, everyday ease",
    href: "/shop?category=kurta-sets",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=85&auto=format&fit=crop",
    span: "normal",
  },
  {
    name: "Anarkalis",
    label: "Anarkali Suits",
    description: "Flowing silhouettes with Mughal grace",
    href: "/shop?category=anarkalis",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=800&q=85&auto=format&fit=crop",
    span: "wide",
  },
  {
    name: "Dupattas",
    label: "Dupattas & Stoles",
    description: "The finishing touch of every look",
    href: "/shop?category=dupattas",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=85&auto=format&fit=crop",
    span: "normal",
  },
];

export default function CategoryShowcase() {
  return (
    <section
      aria-labelledby="categories-heading"
      style={{
        background: "var(--bc-cream)",
        padding: "var(--bc-section) var(--bc-gutter)",
      }}
    >
      <div style={{ maxWidth: "var(--bc-wide)", margin: "0 auto" }}>
        {/* Section header */}
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
              Shop by Category
            </span>
            <h2
              id="categories-heading"
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
              Dressed for
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 400 }}>Every Chapter</em>
            </h2>
          </div>

          <Link
            href="/shop"
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
              flexShrink: 0,
            }}
          >
            View all
          </Link>
        </div>

        {/* Editorial grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "480px 320px",
            gap: "12px",
          }}
        >
          {/* Tall card — sarees */}
          <CategoryCard
            cat={CATEGORIES[0]}
            style={{
              gridColumn: "1 / 5",
              gridRow: "1 / 3",
            }}
          />

          {/* Normal — lehengas */}
          <CategoryCard
            cat={CATEGORIES[1]}
            style={{
              gridColumn: "5 / 9",
              gridRow: "1 / 2",
            }}
          />

          {/* Normal — kurtas */}
          <CategoryCard
            cat={CATEGORIES[2]}
            style={{
              gridColumn: "9 / 13",
              gridRow: "1 / 2",
            }}
          />

          {/* Wide — anarkalis */}
          <CategoryCard
            cat={CATEGORIES[3]}
            style={{
              gridColumn: "5 / 9",
              gridRow: "2 / 3",
            }}
          />

          {/* Normal — dupattas */}
          <CategoryCard
            cat={CATEGORIES[4]}
            style={{
              gridColumn: "9 / 13",
              gridRow: "2 / 3",
            }}
          />
        </div>

        {/* Mobile: horizontal scroll */}
        <style>{`
          @media (max-width: 900px) {
            .bc-cat-grid {
              display: flex !important;
              overflow-x: auto;
              gap: 12px !important;
              scrollbar-width: none;
              -webkit-overflow-scrolling: touch;
            }
            .bc-cat-grid::-webkit-scrollbar { display: none; }
            .bc-cat-grid > * {
              grid-column: unset !important;
              grid-row: unset !important;
              min-width: 240px;
              height: 360px;
              flex-shrink: 0;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

function CategoryCard({
  cat,
  style,
}: {
  cat: Category;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={cat.href}
      style={{
        display: "block",
        position: "relative",
        overflow: "hidden",
        background: "var(--bc-stone)",
        ...style,
      }}
      aria-label={`Shop ${cat.name}`}
    >
      <Image
        src={cat.image}
        alt={cat.name}
        fill
        sizes="(max-width: 900px) 240px, 33vw"
        style={{
          objectFit: "cover",
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
        className="bc-cat-img"
      />

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(26,15,22,0.78) 0%, rgba(26,15,22,0.18) 55%, transparent 100%)",
          transition: "opacity 400ms ease",
        }}
      />

      {/* Content */}
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
            fontSize: "0.625rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--bc-gold-light)",
            margin: "0 0 0.4rem",
            fontWeight: 500,
          }}
        >
          {cat.label}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(1.25rem, 2vw, 1.875rem)",
            fontWeight: 500,
            color: "var(--bc-cream)",
            margin: "0 0 0.3rem",
            lineHeight: 1.1,
          }}
        >
          {cat.name}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.8125rem",
            color: "rgba(255,253,249,0.6)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {cat.description}
        </p>

        {/* Hover CTA */}
        <div
          className="bc-cat-cta"
          style={{
            marginTop: "1rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.6875rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--bc-gold)",
            fontWeight: 500,
            opacity: 0,
            transform: "translateY(8px)",
            transition: "all 320ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          Shop now
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M6.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <style>{`
        a:hover .bc-cat-img { transform: scale(1.06); }
        a:hover .bc-cat-cta { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </Link>
  );
}
