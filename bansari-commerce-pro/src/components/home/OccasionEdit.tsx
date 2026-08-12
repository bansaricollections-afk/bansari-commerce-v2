import Image from "next/image";
import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabase/service";

interface Occasion {
  slug: string;
  name: string;
  count: number;
  image: string;
}

// ── Real, product-backed collections only ──────────────────────────────────
// There is no "occasion" taxonomy wired into the storefront's shop filters
// today (only category/collection), so this section is driven by the same
// real `collection` data as TrendingCollections/FeaturedCollections rather
// than inventing an occasion mapping the catalog doesn't actually support.
async function getRealCollections(): Promise<Occasion[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("products")
    .select("collection, images, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const byCollection = new Map<string, { count: number; image: string }>();
  for (const row of data ?? []) {
    const collection = row.collection as string | null;
    if (!collection) continue;
    const image = Array.isArray(row.images) ? row.images[0]?.url : undefined;
    const existing = byCollection.get(collection);
    if (existing) {
      existing.count += 1;
    } else {
      byCollection.set(collection, { count: 1, image: image ?? "" });
    }
  }

  return Array.from(byCollection.entries())
    .filter(([, info]) => info.image)
    .map(([name, info]) => ({
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      count: info.count,
      image: info.image,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// Fixed collage layout for up to 5 tiles: first is the hero, rest fill the collage.
const LAYOUT: React.CSSProperties[] = [
  { gridColumn: "1 / 6", gridRow: "1 / 3" },
  { gridColumn: "6 / 9", gridRow: "1 / 2" },
  { gridColumn: "9 / 13", gridRow: "1 / 2" },
  { gridColumn: "6 / 9", gridRow: "2 / 3" },
  { gridColumn: "9 / 13", gridRow: "2 / 3" },
];

export default async function OccasionEdit() {
  const collections = await getRealCollections();
  if (collections.length === 0) return null;

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
              The Edit
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
            Shop all
          </Link>
        </div>

        {/* Magazine collage */}
        <div
          className="bc-occ-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "440px 300px",
            gap: "8px",
          }}
        >
          {collections.map((col, i) => (
            <OccasionTile key={col.slug} occ={col} style={LAYOUT[i]} />
          ))}
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
      href={`/shop?collection=${encodeURIComponent(occ.name)}`}
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
          {occ.count} {occ.count === 1 ? "piece" : "pieces"}
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
        a:hover .bc-occ-img { transform: scale(1.06); }
      `}</style>
    </Link>
  );
}
