import Image from "next/image";
import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabase/service";

interface FeaturedCollection {
  slug: string;
  name: string;
  count: number;
  image: string;
}

const BG_TONES = ["var(--bc-cream)", "var(--bc-sand)", "var(--bc-blush)"];

// ── Real, product-backed collections only — same source as /collections
// and TrendingCollections. No editorial copy is invented; the description
// is generated from real product counts, never fabricated marketing claims.
async function getRealFeatured(): Promise<FeaturedCollection[]> {
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
    .slice(0, 3);
}

export default async function FeaturedCollections() {
  const featured = await getRealFeatured();
  if (featured.length === 0) return null;

  return (
    <div aria-labelledby="featured-heading">
      {featured.map((col, i) => (
        <FeaturedPanel key={col.slug} col={col} index={i} total={featured.length} reverse={i % 2 === 1} bg={BG_TONES[i % BG_TONES.length]} />
      ))}
    </div>
  );
}

function FeaturedPanel({
  col,
  index,
  total,
  reverse,
  bg,
}: {
  col: FeaturedCollection;
  index: number;
  total: number;
  reverse: boolean;
  bg: string;
}) {
  return (
    <section
      className="bc-feat-panel"
      style={{
        background: bg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "clamp(520px, 70vh, 800px)",
        }}
      >
        {/* Image */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            order: reverse ? 2 : 1,
          }}
        >
          <Image
            src={col.image}
            alt={`${col.name} — Bansari Collections`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              transition: "transform 800ms cubic-bezier(0.16,1,0.3,1)",
            }}
            className="bc-feat-img"
          />

          {/* Editorial issue number */}
          <span
            style={{
              position: "absolute",
              bottom: "2rem",
              left: reverse ? "auto" : "2rem",
              right: reverse ? "2rem" : "auto",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.5625rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,253,249,0.5)",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              userSelect: "none",
            }}
            aria-hidden="true"
          >
            No. {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            order: reverse ? 1 : 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(3rem, 8vw, 7rem) clamp(2.5rem, 6vw, 5rem)",
            gap: "1.75rem",
          }}
        >
          {/* Tag label */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              style={{
                display: "block",
                width: "2rem",
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
                color: "var(--bc-gold-dark)",
                fontWeight: 500,
              }}
            >
              {col.count} {col.count === 1 ? "piece" : "pieces"} in this edit
            </span>
          </div>

          {/* Headline */}
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
            {col.name}
          </h2>

          {/* CTA — canonical bc-cta-primary */}
          <div>
            <Link href={`/shop?collection=${encodeURIComponent(col.name)}`} className="bc-cta-primary">
              Shop {col.name}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 7h9M7.5 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .bc-feat-img { transition: transform 800ms cubic-bezier(0.16,1,0.3,1); }
        .bc-feat-panel:hover .bc-feat-img { transform: scale(1.04); }
        @media (max-width: 768px) {
          .bc-feat-panel > div {
            grid-template-columns: 1fr !important;
          }
          .bc-feat-panel > div > div:first-child {
            min-height: 360px;
            order: 1 !important;
          }
          .bc-feat-panel > div > div:last-child {
            order: 2 !important;
          }
        }
      `}</style>
    </section>
  );
}
