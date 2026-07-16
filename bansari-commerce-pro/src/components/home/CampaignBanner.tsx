import Link from "next/link";

type Props = {
  headline?: string;
  subline?: string;
  cta?: string;
  href?: string;
};

/**
 * CampaignBanner — full-width editorial campaign strip.
 * Used to promote seasonal collections or offers.
 * All content is passed as props so it can be customised per campaign.
 */
export default function CampaignBanner({
  headline = "The Wedding Edit",
  subline = "Handpicked sarees and lehengas for every celebration of love.",
  cta = "Explore the Collection",
  href = "/collections/wedding",
}: Props) {
  return (
    <section
      aria-label={headline}
      style={{
        backgroundColor: "var(--bc-brand-mauve)",
        paddingBlock: "var(--bc-space-12)",
      }}
    >
      <div
        className="mx-auto flex flex-col items-center gap-5 text-center"
        style={{
          maxWidth: "var(--bc-content-narrow)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-xs)",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Exclusively at Bansari
        </p>

        <h2
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "var(--bc-text-2xl)",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "#fff",
          }}
        >
          {headline}
        </h2>

        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-sm)",
            color: "rgba(255,255,255,0.82)",
            lineHeight: 1.7,
            maxWidth: "38ch",
          }}
        >
          {subline}
        </p>

        <Link
          href={href}
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "var(--bc-text-xs)",
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.6)",
            paddingBlock: "var(--bc-space-3)",
            paddingInline: "var(--bc-space-6)",
            transition: "background-color 200ms ease",
          }}
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
