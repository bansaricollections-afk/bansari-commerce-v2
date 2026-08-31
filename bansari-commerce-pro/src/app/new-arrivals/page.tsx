import Image from "next/image";
import Link from "next/link";

import { getNewArrivals, type Product } from "@/services/product.service";

// Renders live catalog data — must not be frozen at build time.
export const revalidate = 60;

export const metadata = {
  title: "New Arrivals — Latest Ethnic Wear",
  description:
    "Shop the newest arrivals at Bansari Collections — freshly added cotton kurta sets, linen co-ords and embroidered ethnic wear for women. Free shipping over Rs 2,999.",
  alternates: {
    canonical: "https://www.bansaricollection.in/new-arrivals",
  },
  openGraph: {
    title: "New Arrivals | Bansari Collections",
    description: "The latest additions to the Bansari Collections catalogue.",
    url: "https://www.bansaricollection.in/new-arrivals",
    siteName: "Bansari Collections",
    images: ["/opengraph-image"],
  },
};

const WHATSAPP_URL =
  "https://wa.me/918460192745?text=Hi%2C%20I%20am%20interested%20in%20the%20new%20arrivals%20at%20Bansari%20Collections";

/* -------------------------------------------------------------------
   Real catalog only.

   Same source of truth as the homepage New Arrivals section and
   /api/products/new-arrivals: active products with new_arrival = true,
   newest first. No hard-coded products, no stock imagery, no invented
   prices or categories. Products without a real image are excluded
   rather than shown against a placeholder.
------------------------------------------------------------------- */

export default async function NewArrivalsPage() {
  let products: Product[] = [];
  let failed = false;

  try {
    products = await getNewArrivals();
  } catch {
    // Unlike a homepage teaser, this page's entire purpose is the listing.
    // Surface a truthful failure state instead of an empty page that reads
    // as "we have no new products".
    failed = true;
  }

  const withImages = products.filter((p) => p.images?.[0]?.url);

  return (
    <main
      style={{
        backgroundColor: "var(--bc-surface-cream)",
        minHeight: "100vh",
      }}
    >
      {/* ── Page Header ── */}
      <section
        style={{
          backgroundColor: "var(--bc-surface-warm)",
          borderBottom: "1px solid var(--bc-border-soft)",
          paddingBlock: "clamp(3rem, 6vw, 5rem)",
          paddingInline: "var(--bc-gutter)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-xs)",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--bc-text-gold)",
            marginBottom: "var(--bc-space-3)",
          }}
        >
          Just Arrived
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "var(--bc-text-3xl)",
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: "var(--bc-text-primary)",
            marginBottom: "var(--bc-space-4)",
          }}
        >
          New Arrivals
        </h1>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-base)",
            color: "var(--bc-text-muted)",
            maxWidth: "48ch",
            marginInline: "auto",
            lineHeight: 1.7,
          }}
        >
          The most recent additions to our catalogue.
        </p>
      </section>

      {/* ── Breadcrumb ── */}
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
          paddingBlock: "var(--bc-space-4)",
        }}
      >
        <nav aria-label="Breadcrumb">
          <ol
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--bc-space-2)",
              fontSize: "var(--bc-text-xs)",
              color: "var(--bc-text-muted)",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            <li><Link href="/" style={{ color: "var(--bc-text-muted)", textDecoration: "none" }}>Home</Link></li>
            <li aria-hidden="true" style={{ opacity: 0.4 }}>/</li>
            <li style={{ color: "var(--bc-text-primary)" }}>New Arrivals</li>
          </ol>
        </nav>
      </div>

      {/* ── Product Grid — real catalog products only ── */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
          paddingBottom: "var(--bc-space-20)",
        }}
      >
        {failed ? (
          <EmptyState
            heading="We couldn’t load new arrivals just now"
            body="This is a temporary problem on our side, not an empty catalogue. Please refresh in a moment, or browse the full shop."
          />
        ) : withImages.length === 0 ? (
          <EmptyState
            heading="No new arrivals right now"
            body="Nothing is currently flagged as a new arrival. Browse the full catalogue to see everything we stock."
          />
        ) : (
          <>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--bc-text-muted)",
                marginBottom: "var(--bc-space-6)",
              }}
            >
              {withImages.length} {withImages.length === 1 ? "piece" : "pieces"}
            </p>

            <div
              className="bc-new-arrivals-grid"
              style={{
                display: "grid",
                gap: "var(--bc-space-6)",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              }}
            >
              {withImages.map((product, i) => (
                <NewArrivalCard key={product.id} product={product} priority={i === 0} />
              ))}
            </div>
          </>
        )}

        {/* ── Bottom CTA ── */}
        <div
          style={{
            marginTop: "var(--bc-space-16)",
            textAlign: "center",
            paddingTop: "var(--bc-space-10)",
            borderTop: "1px solid var(--bc-border-soft)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "var(--bc-text-xl)",
              fontWeight: 400,
              color: "var(--bc-text-primary)",
              marginBottom: "var(--bc-space-2)",
            }}
          >
            Can’t find what you’re looking for?
          </p>
          <p
            style={{
              fontSize: "var(--bc-text-sm)",
              color: "var(--bc-text-muted)",
              marginBottom: "var(--bc-space-6)",
            }}
          >
            Chat with us on WhatsApp and we’ll help you find the perfect look.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-sm)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#fff",
              backgroundColor: "#25D366",
              padding: "0.875rem 2.25rem",
              borderRadius: "var(--bc-radius-full)",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
          >
            💬 WhatsApp Us
          </a>
        </div>
      </section>

      <style>{`
        .bc-product-card:hover {
          box-shadow: var(--bc-shadow-lg);
        }
        .bc-card-img {
          transition: transform 600ms ease-out;
        }
        .bc-product-card:hover .bc-card-img {
          transform: scale(1.04);
        }
        .bc-card-btn:hover {
          background-color: var(--bc-brand-mauve-dark) !important;
        }
      `}</style>
    </main>
  );
}

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--bc-border-soft)",
        backgroundColor: "#fff",
        padding: "clamp(2.5rem, 6vw, 4.5rem) var(--bc-space-6)",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: "var(--bc-text-xl)",
          fontWeight: 400,
          color: "var(--bc-text-primary)",
          marginBottom: "var(--bc-space-3)",
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontSize: "var(--bc-text-sm)",
          color: "var(--bc-text-muted)",
          maxWidth: "52ch",
          marginInline: "auto",
          lineHeight: 1.7,
          marginBottom: "var(--bc-space-6)",
        }}
      >
        {body}
      </p>
      <Link
        href="/shop"
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "var(--bc-text-xs)",
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--bc-text-inverse)",
          backgroundColor: "var(--bc-brand-mauve)",
          padding: "0.75rem 2rem",
          borderRadius: "var(--bc-radius-full)",
          textDecoration: "none",
        }}
      >
        Shop All
      </Link>
    </div>
  );
}

function NewArrivalCard({ product, priority }: { product: Product; priority?: boolean }) {
  const image = product.images![0]!.url!;
  const alt = product.images![0]!.alt || product.name;

  // Discount is shown only when a real compare price makes it genuine.
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : null;

  return (
    <article
      className="bc-product-card"
      style={{
        backgroundColor: "#fff",
        border: "1px solid var(--bc-border-soft)",
        overflow: "hidden",
        transition: "box-shadow var(--bc-transition-base)",
      }}
    >
      <Link href={`/product/${product.id}`} style={{ display: "block", textDecoration: "none" }}>
        {/* Image */}
        <div
          style={{
            position: "relative",
            aspectRatio: "3/4",
            overflow: "hidden",
            backgroundColor: "var(--bc-surface-offset)",
          }}
        >
          <Image
            src={image}
            alt={alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            style={{ objectFit: "cover", objectPosition: "center top" }}
            className="bc-card-img"
          />
          {/* Badge — driven by the real new_arrival flag that selected this row */}
          <span
            style={{
              position: "absolute",
              top: "var(--bc-space-3)",
              left: "var(--bc-space-3)",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
              backgroundColor: "var(--bc-brand-mauve)",
              padding: "0.25rem 0.625rem",
              borderRadius: "var(--bc-radius-full)",
            }}
          >
            New
          </span>
          {discount !== null && (
            <span
              style={{
                position: "absolute",
                top: "calc(var(--bc-space-3) + 2rem)",
                left: "var(--bc-space-3)",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
                backgroundColor: "#B91C1C",
                padding: "0.25rem 0.625rem",
                borderRadius: "var(--bc-radius-full)",
              }}
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "var(--bc-space-4)" }}>
          {product.category && (
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--bc-text-gold)",
                marginBottom: "var(--bc-space-1)",
              }}
            >
              {product.category}
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "var(--bc-text-base)",
              fontWeight: 400,
              color: "var(--bc-text-primary)",
              marginBottom: "var(--bc-space-2)",
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--bc-space-3)",
              marginTop: "var(--bc-space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "var(--bc-text-base)",
                  fontWeight: 500,
                  color: "var(--bc-text-primary)",
                }}
              >
                ₹{product.price.toLocaleString("en-IN")}
              </p>
              {discount !== null && product.oldPrice && (
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "var(--bc-text-sm)",
                    color: "var(--bc-text-muted)",
                    textDecoration: "line-through",
                  }}
                >
                  ₹{product.oldPrice.toLocaleString("en-IN")}
                </p>
              )}
            </div>
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bc-text-inverse)",
                backgroundColor: "var(--bc-brand-mauve)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--bc-radius-full)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              className="bc-card-btn"
            >
              View
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
