"use client";

import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------
   INSTAGRAM GALLERY — LUXURY EDITORIAL v2
   Benchmark: Aza Fashions · Pernia's Pop-Up Shop social sections

   Changes from v1
   ───────────────
   - rounded-3xl REMOVED → tiles are flush rectangles (no radius)
   - group-hover:scale-110 REMOVED → scale(1.025) over 700ms ease-out
   - Centered heading with tracking-[5px] + font-bold REMOVED
   - Now: left-aligned eyebrow + editorial H2 at --bc-text-xl
   - H2 copy: 'As Worn' — editorial, not descriptive
   - Follow CTA: ghost pill with mauve border, no background flash
   - All hardcoded gray/color values → --bc-* tokens
   - Tiles: square aspect ratio preserved
   - 3-col desktop / 2-col mobile grid preserved
   - No radius on tile wrapper — matches zero-radius language of hero & category grid
------------------------------------------------------------------ */

const gallery = [
  { src: "/instagram/1.jpg", alt: "Bansari customer in saree — festive occasion" },
  { src: "/instagram/2.jpg", alt: "Bansari kurta set — contemporary styling" },
  { src: "/instagram/3.jpg", alt: "Bansari anarkali — celebration look" },
  { src: "/instagram/4.jpg", alt: "Bansari co-ord set — casual elegance" },
  { src: "/instagram/5.jpg", alt: "Bansari ethnic — heritage detail" },
  { src: "/instagram/6.jpg", alt: "Bansari collection — festive edit" },
];

export default function InstagramGallery() {
  return (
    <section
      aria-label="As Worn — Instagram gallery"
      style={{
        backgroundColor: "var(--bc-surface-cream)",
        paddingBlock: "var(--bc-section-padding)",
        borderTop: "1px solid var(--bc-border-soft)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >

        {/* ── Header: left-aligned, editorial ── */}
        <div
          style={{
            marginBottom: "var(--bc-space-10)",
            borderBottom: "1px solid var(--bc-border-soft)",
            paddingBottom: "var(--bc-space-6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--bc-space-4)",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--bc-text-gold)",
                marginBottom: "var(--bc-space-2)",
              }}
            >
              @bansaricollections
            </p>
            <h2
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: "var(--bc-text-xl)",
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: "var(--bc-text-primary)",
              }}
            >
              As Worn
            </h2>
          </div>

          {/* Follow link — desktop, inline with heading */}
          <Link
            href="https://instagram.com/bansaricollections"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Bansari Collections on Instagram"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bc-brand-mauve)",
              border: "1px solid var(--bc-brand-mauve)",
              borderRadius: "var(--bc-radius-full)",
              padding: "0.625rem 1.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--bc-space-2)",
              transition: "background-color var(--bc-transition-base)",
              flexShrink: 0,
            }}
            className="bc-instagram-follow"
          >
            Follow on Instagram
          </Link>
        </div>

        {/* ── Gallery grid ── */}
        <div className="grid grid-cols-2 gap-px md:grid-cols-3">
          {gallery.map(({ src, alt }, index) => (
            <Link
              href="https://instagram.com/bansaricollections"
              target="_blank"
              rel="noopener noreferrer"
              key={index}
              aria-label={alt}
              className="bc-instagram-tile relative block aspect-square overflow-hidden"
            >
              <div
                className="bc-instagram-tile__inner h-full w-full"
                style={{ transition: "transform 700ms ease-out" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.025)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                }}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Link>
          ))}
        </div>

      </div>

      <style>{`
        .bc-instagram-follow:hover {
          background-color: var(--bc-brand-mauve-faint);
        }
        .bc-instagram-tile {
          border-radius: 0;
        }
      `}</style>
    </section>
  );
}
