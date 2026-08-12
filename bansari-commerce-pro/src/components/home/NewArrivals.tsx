import { getNewArrivals } from "@/services/product.service";
import NewArrivalsRail from "./NewArrivalsRail";

// ── Real, catalog-driven only ───────────────────────────────────────────────
// Pulls directly from the same `getNewArrivals()` service used by
// /api/products/new-arrivals and /new-arrivals — active products with
// new_arrival = true, newest first. No fabricated products, no stock images.
export default async function NewArrivals() {
  let products: Awaited<ReturnType<typeof getNewArrivals>> = [];
  try {
    products = await getNewArrivals();
  } catch {
    // A homepage teaser section must never take the whole page down —
    // degrade to "no section" rather than propagate the error.
    return null;
  }
  const withImages = products.filter((p) => p.images && p.images.length > 0 && p.images[0]?.url);

  if (withImages.length === 0) return null;

  return (
    <section
      aria-labelledby="new-arrivals-heading"
      style={{
        background: "var(--bc-cream)",
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
              Just Arrived
            </span>
            <h2
              id="new-arrivals-heading"
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
              New Arrivals
            </h2>
          </div>
          <a
            href="/new-arrivals"
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
          </a>
        </div>
      </div>

      {/* Product rail — real products, horizontal scroll/slide */}
      <NewArrivalsRail products={withImages} />
    </section>
  );
}
