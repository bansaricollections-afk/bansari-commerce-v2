import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------
   CATEGORY DATA
   occasion: occasion-led label (not marketing copy)
   objectPosition: tuned per garment for face → embroidery priority
------------------------------------------------------------------ */
const featured = {
  title: "Sarees",
  occasion: "Wedding & Celebration",
  image: "/categories/sarees.png",
  alt: "Model in embroidered silk saree — face, neck embroidery and pallu border visible",
  link: "/shop?category=sarees",
  objectPosition: "center top",
};

const supporting: {
  title: string;
  occasion: string;
  image: string;
  alt: string;
  link: string;
  objectPosition: string;
}[] = [
  {
    title: "Kurta Sets",
    occasion: "Contemporary Ease",
    image: "/categories/kurta.png",
    alt: "Model in embroidered kurta set — yoke embroidery and sleeve detail visible",
    link: "/shop?category=kurta-sets",
    objectPosition: "center 20%",
  },
  {
    title: "Co-ord Sets",
    occasion: "Modern Ease",
    image: "/categories/coords.png",
    alt: "Model in co-ord set — full silhouette and garment composition visible",
    link: "/shop?category=co-ord-sets",
    objectPosition: "center center",
  },
  {
    title: "Anarkali",
    occasion: "Timeless Grace",
    image: "/categories/anarkali.png",
    alt: "Model in Anarkali — face, neck embroidery and flared silhouette visible",
    link: "/shop?category=anarkali",
    objectPosition: "center top",
  },
  {
    title: "Western Wear",
    occasion: "Modern Silhouettes",
    image: "/categories/western wear.png",
    alt: "Model in western wear — full silhouette and garment cut visible",
    link: "/shop?category=western-wear",
    objectPosition: "center center",
  },
];

const closing = {
  title: "Ethnic Glory",
  occasion: "Heritage Craft",
  image: "/categories/Ethnic Glory.png",
  alt: "Model in ethnic ensemble — border embroidery and garment heritage detail visible",
  link: "/shop?category=ethnic-glory",
  objectPosition: "center 30%",
};

/* ------------------------------------------------------------------
   TILE LABEL OVERLAY
   Sits inside the image plane at the bottom.
   No external card div. No shadow. No radius.
------------------------------------------------------------------ */
function TileLabel({
  title,
  occasion,
  cta = true,
}: {
  title: string;
  occasion: string;
  cta?: boolean;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-5 pb-5 pt-10"
      style={{
        background:
          `linear-gradient(to top, var(--bc-surface-overlay-deep) 0%, rgba(29,16,24,0.28) 60%, transparent 100%)`,
      }}
    >
      <span
        className="font-inter block tracking-widest uppercase"
        style={{
          fontSize: "var(--bc-text-xs)",
          color: "var(--bc-text-gold)",
          letterSpacing: "0.14em",
        }}
      >
        {occasion}
      </span>
      <span
        className="font-playfair block"
        style={{
          fontSize: "var(--bc-text-lg)",
          color: "var(--bc-text-inverse)",
          fontWeight: 500,
          lineHeight: 1.15,
        }}
      >
        {title}
      </span>
      {cta && (
        <span
          className="font-inter mt-1 block"
          style={{
            fontSize: "var(--bc-text-sm)",
            color: "var(--bc-text-inverse)",
            opacity: 0.72,
          }}
        >
          Discover →
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   IMAGE TILE
   overflow-hidden on the outer Link clips the scale transform.
   No shadow. No radius. Scale 1 → 1.02 over 750 ms ease-out only.
------------------------------------------------------------------ */
function ImageTile({
  title,
  occasion,
  image,
  alt,
  link,
  objectPosition,
  priority = false,
  className = "",
  sizes = "50vw",
}: {
  title: string;
  occasion: string;
  image: string;
  alt: string;
  link: string;
  objectPosition: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <Link
      href={link}
      aria-label={`Shop ${title} — ${occasion}`}
      className={`relative block overflow-hidden${className ? ` ${className}` : ""}`}
    >
      <div
        className="h-full w-full"
        style={{
          transition: "transform 750ms ease-out",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        }}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition }}
        />
      </div>
      <TileLabel title={title} occasion={occasion} />
    </Link>
  );
}

/* ------------------------------------------------------------------
   CATEGORY GRID — OPTION B v3
   Desktop: featured (left, ~60%) + 2×2 supporting grid (right, ~40%)
   Closing: full-width editorial band for Ethnic Glory
   Mobile: natural single-column stack — no carousel
------------------------------------------------------------------ */
export default function CategoryGrid() {
  return (
    <section
      aria-label="Shop The Edit — curated category discovery"
      style={{
        backgroundColor: "var(--bc-surface-warm)",
        paddingBlock: "var(--bc-section-padding)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        {/* ── Section heading ── */}
        <div
          className="mb-10"
          style={{ borderBottom: "1px solid var(--bc-border-soft)", paddingBottom: "var(--bc-space-6)" }}
        >
          <p
            className="font-inter mb-2 tracking-widest uppercase"
            style={{
              fontSize: "var(--bc-text-xs)",
              color: "var(--bc-text-gold)",
              letterSpacing: "0.16em",
            }}
          >
            The Edit
          </p>
          <h2
            className="font-playfair"
            style={{
              fontSize: "var(--bc-text-xl)",
              color: "var(--bc-text-primary)",
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            Shop The Edit
          </h2>
        </div>

        {/* ── Main layout: featured left + 2×2 supporting right ── */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Desktop two-column wrapper */}
          <div
            className="grid gap-2"
            style={{
              /* Desktop: featured at 3fr, supporting grid at 2fr */
              gridTemplateColumns: "1fr",
            }}
          >
            {/* Responsive two-column at md+ */}
            <div
              className="grid gap-2 md:grid-cols-[3fr_2fr]"
            >
              {/* Featured tile — Sarees */}
              <ImageTile
                {...featured}
                priority
                sizes="(min-width: 768px) 60vw, 100vw"
                className=" md:min-h-[680px] min-h-[420px]"
              />

              {/* Supporting 2×2 grid */}
              <div className="grid grid-cols-2 gap-2">
                {supporting.map((cat, i) => (
                  <ImageTile
                    key={cat.title}
                    {...cat}
                    priority={false}
                    sizes="(min-width: 768px) 20vw, 50vw"
                    className="min-h-[200px] md:min-h-[336px]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Closing editorial band — Ethnic Glory ── */}
        <div
          className="mt-2 grid md:grid-cols-[1fr_2fr] items-center gap-0"
          style={{
            borderTop: "1px solid var(--bc-border-soft)",
            borderBottom: "1px solid var(--bc-border-soft)",
            backgroundColor: "var(--bc-surface-cream)",
          }}
        >
          {/* Editorial text side */}
          <div
            className="flex flex-col justify-center"
            style={{ padding: "var(--bc-space-10) var(--bc-space-8)" }}
          >
            <p
              className="font-inter mb-3 tracking-widest uppercase"
              style={{
                fontSize: "var(--bc-text-xs)",
                color: "var(--bc-text-gold)",
                letterSpacing: "0.16em",
              }}
            >
              {closing.occasion}
            </p>
            <h3
              className="font-playfair mb-4"
              style={{
                fontSize: "var(--bc-text-xl)",
                color: "var(--bc-text-primary)",
                fontWeight: 500,
                lineHeight: 1.15,
              }}
            >
              {closing.title}
            </h3>
            <p
              className="font-inter mb-6"
              style={{
                fontSize: "var(--bc-text-sm)",
                color: "var(--bc-text-muted)",
                maxWidth: "32ch",
                lineHeight: 1.7,
              }}
            >
              Craftsmanship rooted in tradition. Each piece honours the artisans
              behind every stitch.
            </p>
            <Link
              href={closing.link}
              aria-label={`Shop ${closing.title} — ${closing.occasion}`}
              className="font-inter inline-flex w-fit items-center gap-2"
              style={{
                fontSize: "var(--bc-text-sm)",
                color: "var(--bc-text-secondary)",
                borderBottom: "1px solid var(--bc-border-gold)",
                paddingBottom: "2px",
                transition: "color var(--bc-transition-base), border-color var(--bc-transition-base)",
              }}
            >
              Discover →
            </Link>
          </div>

          {/* Image side */}
          <div
            className="relative overflow-hidden"
            style={{ height: "clamp(260px, 36vw, 480px)" }}
          >
            <div
              className="h-full w-full"
              style={{ transition: "transform 750ms ease-out" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              }}
            >
              <Image
                src={closing.image}
                alt={closing.alt}
                fill
                sizes="(min-width: 768px) 66vw, 100vw"
                className="object-cover"
                style={{ objectPosition: closing.objectPosition }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
