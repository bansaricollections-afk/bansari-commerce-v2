"use client";

import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------------------------------
   INSTAGRAM GALLERY — LUXURY EDITORIAL v3
   Benchmark: Aza Fashions · Pernia's Pop-Up Shop social sections

   Handle: @bansari_collections  (with underscore)

   Images: Unsplash ethnic fashion (free commercial use)
   Local /instagram/*.jpg files removed — replaced with Unsplash
   so tiles always render in production and in preview.
------------------------------------------------------------------ */

const INSTAGRAM_URL = "https://instagram.com/bansari_collections";
const INSTAGRAM_HANDLE = "@bansari_collections";

const gallery = [
  {
    src: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — crimson silk saree with gold zari border",
  },
  {
    src: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — ivory embroidered kurta set",
  },
  {
    src: "https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — rose anarkali gown for festive occasion",
  },
  {
    src: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — teal chanderi co-ord set",
  },
  {
    src: "https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — ivory and gold bridal lehenga",
  },
  {
    src: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    alt: "Bansari — midnight blue georgette saree",
  },
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
              {INSTAGRAM_HANDLE}
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
            href={INSTAGRAM_URL}
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
              href={INSTAGRAM_URL}
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
