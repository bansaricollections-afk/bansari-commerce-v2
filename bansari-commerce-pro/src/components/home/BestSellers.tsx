import Link from "next/link";

import { getBestSellers } from "@/services/product.service";
import BestSellersRail from "./BestSellersRail";

// ── Real, catalog-driven only ───────────────────────────────────────────────
// Driven by the admin-set `best_seller` flag in Product Management — a real
// curation signal owned by the business. No purchase history exists to rank
// by (order_items is empty), so no sales-derived score is invented here.
export default async function BestSellers() {
  let products: Awaited<ReturnType<typeof getBestSellers>> = [];
  try {
    products = await getBestSellers();
  } catch {
    // A homepage teaser section must never take the whole page down.
    return null;
  }
  const withImages = products.filter((p) => p.images && p.images.length > 0 && p.images[0]?.url);

  if (withImages.length === 0) return null;

  return (
    <section
      aria-labelledby="bestsellers-heading"
      style={{
        background: "var(--bc-blush)",
        padding: "var(--bc-section) 0",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "0 var(--bc-gutter)", maxWidth: "var(--bc-wide)", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(2rem, 3.5vw, 3.5rem)",
            gap: "1.5rem",
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
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              <span style={{ display: "block", width: "2rem", height: "1px", background: "var(--bc-gold)" }} />
              Handpicked by Bansari
            </span>
            <h2
              id="bestsellers-heading"
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
              Best Sellers
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
            Shop all
          </Link>
        </div>
      </div>

      {/* Product rail — real products, ranked by real page views */}
      <BestSellersRail products={withImages} />
    </section>
  );
}
