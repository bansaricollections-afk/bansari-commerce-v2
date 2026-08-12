import Image from "next/image";
import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabase/service";

interface Category {
  name: string;
  count: number;
  image: string;
}

// ── Real, product-backed categories only ───────────────────────────────────
// Source of truth: the products table's `category` text field, the exact
// same value Admin Product Management writes on save. A category only
// appears here if it has at least one active product with a real image.
async function getRealCategories(): Promise<Category[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("products")
    .select("category, images, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const byCategory = new Map<string, { count: number; image: string }>();
  for (const row of data ?? []) {
    const category = row.category as string | null;
    if (!category) continue;
    const image = Array.isArray(row.images) ? row.images[0]?.url : undefined;
    const existing = byCategory.get(category);
    if (existing) {
      existing.count += 1;
    } else {
      byCategory.set(category, { count: 1, image: image ?? "" });
    }
  }

  return Array.from(byCategory.entries())
    .filter(([, info]) => info.image)
    .map(([name, info]) => ({ name, count: info.count, image: info.image }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default async function CategoryShowcase() {
  const categories = await getRealCategories();
  if (categories.length === 0) return null;

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

        {/* Editorial grid — first category large, rest uniform. Robust to any real count. */}
        <div
          className="bc-cat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(categories.length, 5)}, 1fr)`,
            gap: "12px",
          }}
        >
          {categories.map((cat, i) => (
            <CategoryCard key={cat.name} cat={cat} large={i === 0} />
          ))}
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

function CategoryCard({ cat, large }: { cat: Category; large?: boolean }) {
  return (
    <Link
      href={`/shop?category=${encodeURIComponent(cat.name)}`}
      style={{
        display: "block",
        position: "relative",
        overflow: "hidden",
        aspectRatio: large ? "2/3" : "3/4",
        background: "var(--bc-stone)",
      }}
      aria-label={`Shop ${cat.name}`}
    >
      <Image
        src={cat.image}
        alt={cat.name}
        fill
        sizes="(max-width: 900px) 240px, 20vw"
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
          {cat.count} {cat.count === 1 ? "piece" : "pieces"}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: "clamp(1.25rem, 2vw, 1.875rem)",
            fontWeight: 500,
            color: "var(--bc-cream)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {cat.name}
        </h3>

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
