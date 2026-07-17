import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "New Arrivals | Bansari Collections",
  description:
    "Discover the latest ethnic wear arrivals from Bansari Collections — premium sarees, kurta sets, anarkalis and lehengas for every celebration.",
  openGraph: {
    title: "New Arrivals | Bansari Collections",
    description: "Fresh ethnic styles, just arrived. Shop premium sarees, kurta sets and lehengas.",
    url: "https://bansaricollections.com/new-arrivals",
    siteName: "Bansari Collections",
  },
};

/* -------------------------------------------------------------------
   Static new-arrival products
   Images: Unsplash ethnic fashion (free commercial use)
   These will be replaced with real Supabase product data once
   products are seeded in the database.
------------------------------------------------------------------- */
const NEW_ARRIVALS = [
  {
    id: 1,
    name: "Crimson Silk Saree",
    category: "Sarees",
    price: 3499,
    badge: "New",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    alt: "Crimson silk saree with gold zari border",
  },
  {
    id: 2,
    name: "Ivory Embroidered Kurta Set",
    category: "Kurta Sets",
    price: 2199,
    badge: "New",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    alt: "Ivory embroidered kurta set with palazzo",
  },
  {
    id: 3,
    name: "Rose Anarkali Gown",
    category: "Ethnic Dresses",
    price: 4299,
    badge: "New",
    image: "https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=600&q=80",
    alt: "Rose pink anarkali gown for festive occasions",
  },
  {
    id: 4,
    name: "Teal Chanderi Co-ord Set",
    category: "Co-ord Sets",
    price: 2799,
    badge: "New",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
    alt: "Teal chanderi co-ord set with block print",
  },
  {
    id: 5,
    name: "Bridal Lehenga — Ivory & Gold",
    category: "Lehengas",
    price: 12999,
    badge: "Limited",
    image: "https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?auto=format&fit=crop&w=600&q=80",
    alt: "Ivory and gold bridal lehenga with heavy embroidery",
  },
  {
    id: 6,
    name: "Mustard Block Print Suit",
    category: "Kurta Sets",
    price: 1899,
    badge: "New",
    image: "https://images.unsplash.com/photo-1594938298603-f8d9b1d4f85a?auto=format&fit=crop&w=600&q=80",
    alt: "Mustard block print cotton suit set",
  },
  {
    id: 7,
    name: "Midnight Blue Georgette Saree",
    category: "Sarees",
    price: 2899,
    badge: "New",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    alt: "Midnight blue georgette saree with silver border",
  },
  {
    id: 8,
    name: "Festive Red Sharara Set",
    category: "Co-ord Sets",
    price: 3299,
    badge: "New",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    alt: "Festive red sharara set with mirror work",
  },
];

const WHATSAPP_URL =
  "https://wa.me/918460192745?text=Hi%2C%20I%20am%20interested%20in%20the%20new%20arrivals%20at%20Bansari%20Collections";

export default function NewArrivalsPage() {
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
          Fresh ethnic styles crafted for weddings, celebrations and everyday
          elegance — be the first to wear them.
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

      {/* ── Product Grid ── */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
          paddingBottom: "var(--bc-space-20)",
        }}
      >
        <div
          className="bc-new-arrivals-grid"
          style={{
            display: "grid",
            gap: "var(--bc-space-6)",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          }}
        >
          {NEW_ARRIVALS.map((product) => (
            <article
              key={product.id}
              className="bc-product-card"
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--bc-border-soft)",
                overflow: "hidden",
                transition: "box-shadow var(--bc-transition-base)",
              }}
            >
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
                  src={product.image}
                  alt={product.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  className="bc-card-img"
                />
                {/* Badge */}
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
                    backgroundColor: product.badge === "Limited"
                      ? "var(--bc-gold-warm)"
                      : "var(--bc-brand-mauve)",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "var(--bc-radius-full)",
                  }}
                >
                  {product.badge}
                </span>
              </div>

              {/* Info */}
              <div style={{ padding: "var(--bc-space-4)" }}>
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
                    marginTop: "var(--bc-space-3)",
                  }}
                >
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
                  <Link
                    href="/shop"
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
                      textDecoration: "none",
                      transition: "background-color var(--bc-transition-base)",
                    }}
                    className="bc-card-btn"
                  >
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

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
