import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section aria-label="Hero" className="bg-[var(--bc-surface-cream)]">

      <div
        className="mx-auto grid min-h-[90vh] items-center gap-16 px-6 lg:grid-cols-2"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingBlock: "var(--bc-section-padding)",
        }}
      >

        {/* ── LEFT ── */}

        <div>

          {/* Eyebrow — plain tracked uppercase, no pill, no emoji */}
          <p
            className="text-[var(--bc-text-xs)] font-medium uppercase tracking-[0.25em]"
            style={{ color: "var(--bc-gold-warm)" }}
          >
            The 2026 Edit
          </p>

          {/* Headline — 2 editorial lines, Playfair Display weight 550 */}
          <h1
            className="mt-6 font-[family:var(--font-playfair)] text-[var(--bc-text-3xl)] leading-[1.08]"
            style={{ fontWeight: 550 }}
          >
            Where Tradition Meets
            <br />
            Timeless Style
          </h1>

          {/* Body copy — narrowed for editorial intimacy */}
          <p
            className="mt-6 max-w-md text-[var(--bc-text-base)] leading-relaxed"
            style={{ color: "var(--bc-text-muted)" }}
          >
            Discover thoughtfully crafted ethnic wear designed for weddings,
            celebrations, festive occasions and everyday elegance.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              href="/shop"
              className="inline-flex items-center rounded-full px-10 py-3.5 font-medium tracking-wide text-white transition"
              style={{ backgroundColor: "var(--bc-brand-mauve)" }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  "var(--bc-brand-mauve-dark)")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  "var(--bc-brand-mauve)")
              }
            >
              Shop The Edit
            </Link>

            <Link
              href="/collections"
              className="inline-flex items-center rounded-full border px-10 py-3.5 font-medium tracking-wide transition"
              style={{
                borderColor: "var(--bc-brand-mauve)",
                color: "var(--bc-brand-mauve)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  "var(--bc-surface-warm)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  "transparent";
              }}
            >
              Explore Collections
            </Link>

          </div>

          {/*
            Editorial divider + trust metadata row.
            Semantic structure preserved: dl > div > (dt + dd).
            Restyled as a single inline metadata line beneath a thin rule.
          */}
          <div
            className="mt-10 border-t pt-6"
            style={{ borderColor: "var(--bc-border-soft)" }}
          >
            <dl
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1"
              aria-label="Brand credentials"
            >

              <div className="flex items-baseline gap-1.5">
                <dd
                  className="text-[var(--bc-text-sm)] font-medium"
                  style={{ color: "var(--bc-text-secondary)" }}
                >
                  500+
                </dd>
                <dt
                  className="text-[var(--bc-text-xs)] uppercase tracking-[0.15em]"
                  style={{ color: "var(--bc-text-faint)" }}
                >
                  Curated Styles
                </dt>
              </div>

              <span aria-hidden="true" style={{ color: "var(--bc-border-gold)" }}>·</span>

              <div className="flex items-baseline gap-1.5">
                <dd
                  className="text-[var(--bc-text-sm)] font-medium"
                  style={{ color: "var(--bc-text-secondary)" }}
                >
                  Quality Assured
                </dd>
                <dt
                  className="text-[var(--bc-text-xs)] uppercase tracking-[0.15em]"
                  style={{ color: "var(--bc-text-faint)" }}
                >
                  Every Piece
                </dt>
              </div>

              <span aria-hidden="true" style={{ color: "var(--bc-border-gold)" }}>·</span>

              <div className="flex items-baseline gap-1.5">
                <dd
                  className="text-[var(--bc-text-sm)] font-medium"
                  style={{ color: "var(--bc-text-secondary)" }}
                >
                  Pan-India
                </dd>
                <dt
                  className="text-[var(--bc-text-xs)] uppercase tracking-[0.15em]"
                  style={{ color: "var(--bc-text-faint)" }}
                >
                  Delivery
                </dt>
              </div>

            </dl>
          </div>

        </div>

        {/* ── RIGHT ── */}

        {/*
          Batch 10A — Option C approved.
          rounded-2xl removed. boxShadow removed.
          Image is completely flush: no radius, no shadow.
          Every image on the homepage now shares zero-radius, zero-shadow language.
          Dimensions (600×900), priority, alt text, layout, crop: unchanged.
        */}
        <div className="flex justify-end">

          <Image
            src="/hero/hero.png"
            alt="Bansari Collections — curated ethnic wear"
            width={600}
            height={900}
            priority
          />

        </div>

      </div>

    </section>
  );
}
