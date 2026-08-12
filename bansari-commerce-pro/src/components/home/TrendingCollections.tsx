import Link from "next/link";
import Image from "next/image";

import { createServiceRoleClient } from "@/lib/supabase/service";

interface Collection {
  slug: string;
  name: string;
  count: number;
  image: string;
}

// ── Real, product-backed collections only ──────────────────────────────────
// Same source of truth as /collections: the products table's `collection`
// text field, populated by Admin Product Management. Nothing here is
// hard-coded — a collection only appears if it has at least one active
// product with a real image.
async function getRealCollections(): Promise<Collection[]> {
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
    .slice(0, 6);
}

export default async function TrendingCollections() {
  const collections = await getRealCollections();
  if (collections.length === 0) return null;

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
          className="bc-trend-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(collections.length, 6)}, 1fr)`,
            gap: "12px",
          }}
        >
          {collections.map((col, i) => (
            <CollectionTile key={col.slug} col={col} large={i === 0} />
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
      href={`/shop?collection=${encodeURIComponent(col.name)}`}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        aspectRatio: large ? "2/3" : "3/4",
        background: "var(--bc-stone)",
        cursor: "pointer",
      }}
      aria-label={`Shop ${col.name} collection`}
    >
      <Image
        src={col.image}
        alt={col.name}
        fill
        sizes="(max-width: 640px) 50vw, 16vw"
        style={{
          objectFit: "cover",
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
        className="bc-trend-img"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(26,15,22,0.85) 0%, rgba(26,15,22,0.35) 45%, transparent 100%)",
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
        {col.count} {col.count === 1 ? "piece" : "pieces"}
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
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {col.name}
        </h3>
      </div>

      <style>{`
        a:hover .bc-trend-img { transform: scale(1.05); }
      `}</style>
    </Link>
  );
}
