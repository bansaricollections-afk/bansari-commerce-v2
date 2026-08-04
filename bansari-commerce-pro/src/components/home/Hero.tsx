"use client";

import Image from "next/image";
import Link from "next/link";

/* -----------------------------------------------------------------------
   HERO — LUXURY EDITORIAL v5 "City Palace"
   ─────────────────────────────────────────────────────────────────────
   Benchmark: Sabyasachi · Raw Mango · Aza Fashions · Dior · Hermès

   Image: Pexels #30064823 — Manish Jangid
          Woman in red traditional dress at City Palace Jaipur
          Stone arches, warm sandstone, 4096 × 3512 px landscape
          Pexels Free License — commercial use permitted, no attribution req.

   object-position: 25% center
   ─ Tested against 20% (right edge slightly clipped on narrow viewports)
     and 30% (face drifts toward right column seam on wide screens).
     25% is the sweet-spot: face centred in right column, full garment
     visible, stone arches frame the left, negative space breathes.

   Desktop layout (≥ 1024 px)
   ─────────────────────────────────────────────────────────────────────
   Left  45%  Editorial text, vertically centred
   Right 55%  Full-height image, flush to right viewport edge
   An ivory-to-transparent gradient bridges the join.

   Mobile (< 1024 px)
   ─────────────────────────────────────────────────────────────────────
   Image first (70 svh), full width, object-position center top.
   Text block below. No face crop. No garment crop.
----------------------------------------------------------------------- */

// Pexels #30064823 — Manish Jangid — City Palace Jaipur
// 4096 × 3512 px, landscape, warm ivory sandstone arches
const HERO_IMAGE =
  "https://images.pexels.com/photos/30064823/pexels-photo-30064823.jpeg?auto=compress&cs=tinysrgb&w=2400&q=85";

export default function Hero() {
  return (
    <section
      aria-label="Hero — Bansari Collections 2026 Couture Edit"
      className="bc5-hero"
    >
      {/* ── FULL-BLEED GRID ── */}
      <div className="bc5-hero__grid">

        {/* ── LEFT: TEXT ── */}
        <div className="bc5-hero__text" role="group" aria-label="Hero content">

          {/* Gold eyebrow */}
          <p className="bc5-eyebrow" aria-label="Collection season">
            <span className="bc5-eyebrow__line" aria-hidden="true" />
            The 2026 Couture Edit
          </p>

          {/* Main headline */}
          <h1 className="bc5-headline">
            Where Heritage
            <br />
            <em className="bc5-headline__em">Becomes</em>
            <br />
            Your Story
          </h1>

          {/* Subline */}
          <p className="bc5-subline">
            Couture ethnic wear for weddings, festivities and every
            chapter of celebration — crafted for the modern Indian woman.
          </p>

          {/* CTAs */}
          <div className="bc5-ctas">
            <Link href="/shop" className="bc5-btn bc5-btn--primary">
              Shop The Edit
            </Link>
            <Link href="/collections" className="bc5-btn bc5-btn--ghost">
              View Collections
            </Link>
          </div>

          {/* Trust metadata */}
          <div className="bc5-meta">
            <dl className="bc5-meta__list">
              <div className="bc5-meta__item">
                <dd className="bc5-meta__value">500+</dd>
                <dt className="bc5-meta__label">Curated Styles</dt>
              </div>
              <span className="bc5-meta__sep" aria-hidden="true" />
              <div className="bc5-meta__item">
                <dd className="bc5-meta__value">Artisan</dd>
                <dt className="bc5-meta__label">Crafted</dt>
              </div>
              <span className="bc5-meta__sep" aria-hidden="true" />
              <div className="bc5-meta__item">
                <dd className="bc5-meta__value">Pan-India</dd>
                <dt className="bc5-meta__label">Delivery</dt>
              </div>
            </dl>
          </div>
        </div>

        {/* ── RIGHT: IMAGE ── */}
        <div className="bc5-hero__image-wrap" aria-hidden="true">
          {/*
            Cinematic overlays (stacked, pointer-events: none):
            1. Ivory veil  — left edge gradient so text never collides
            2. Warm tint   — very subtle sepia wash (oklch warm amber at 6%)
               preserves natural palette, adds magazine warmth
            3. Vignette    — radial darkening at edges, keeps focus central
          */}
          <div className="bc5-hero__veil" />
          <div className="bc5-hero__warm-tint" />
          <div className="bc5-hero__vignette" />

          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 58vw"
            className="bc5-hero__img"
          />
        </div>
      </div>

      {/* ── SCROLL CUE ── */}
      <div className="bc5-scroll-cue" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── STYLES ── */}
      <style>{`

        /* ═══════════════════════════════════════════
           SECTION
        ═══════════════════════════════════════════ */
        .bc5-hero {
          position: relative;
          overflow: hidden;
          background-color: var(--bc-surface-cream);
        }
        /* Subtle warm grain — keeps the luxury feel, very low opacity */
        .bc5-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 4;
        }

        /* ═══════════════════════════════════════════
           GRID
        ═══════════════════════════════════════════ */
        .bc5-hero__grid {
          display: grid;
          min-height: 100svh;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          position: relative;
          z-index: 2;
        }
        @media (min-width: 1024px) {
          .bc5-hero__grid {
            grid-template-columns: 45fr 55fr;
            grid-template-rows: 1fr;
          }
        }

        /* ═══════════════════════════════════════════
           TEXT COLUMN
        ═══════════════════════════════════════════ */
        .bc5-hero__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(5rem, 10vw, 7rem) clamp(1.5rem, 5vw, 4.5rem)
                   clamp(3rem, 6vw, 5rem)  clamp(1.5rem, 5vw, 4.5rem);
          order: 2;
          position: relative;
          z-index: 5;
        }
        @media (min-width: 1024px) {
          .bc5-hero__text {
            order: 1;
            padding-left: clamp(2.5rem, 5vw, 5rem);
            padding-right: clamp(2rem, 4vw, 4rem);
          }
        }
        @media (min-width: 1440px) {
          .bc5-hero__text {
            padding-left: clamp(4rem, 6vw, 7rem);
          }
        }

        /* ═══════════════════════════════════════════
           IMAGE COLUMN
        ═══════════════════════════════════════════ */
        .bc5-hero__image-wrap {
          position: relative;
          /*
            Reserve explicit height before image loads → zero CLS.
            mobile: 70svh, desktop: full grid row (100svh via parent).
          */
          min-height: 70svh;
          order: 1;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .bc5-hero__image-wrap {
            order: 2;
            min-height: 100svh;
            /* Bleed to viewport right edge */
            margin-right: calc(-1 * ((100vw - 100%) / 2));
          }
        }

        /* ─── THE IMAGE ─────────────────────────────
           object-fit: cover  — fills column, never squishes
           object-position: 25% center  — on desktop the figure sits
             in the right 55% column; 25% from the left of the *image*
             means the palace archway fills the left and the woman
             occupies the right portion naturally.
           filter: slight contrast lift + gentle saturation boost.
             contrast(1.04)  → crisps sandstone texture
             saturate(1.05)  → warms the red dress without oversaturation
             Both are imperceptible individually; combined they add the
             "editorial warmth" that separates campaign from stock.
        ─────────────────────────────────────────── */
        .bc5-hero__img {
          object-fit: cover;
          object-position: 25% center;
          filter: contrast(1.04) saturate(1.05);
          will-change: transform; /* GPU layer — prevents repaint flicker */
        }
        @media (max-width: 1023px) {
          .bc5-hero__img {
            /* On mobile, keep face visible near the top */
            object-position: center 15%;
          }
        }

        /* ─── IVORY VEIL (desktop only) ─────────────
           Fades from cream to transparent on the left edge of the
           image column so the text column has a clean ivory backing
           and no hard seam where columns meet.
        ─────────────────────────────────────────── */
        .bc5-hero__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            oklch(97% 0.008 80) 0%,
            oklch(97% 0.008 80 / 0.45) 15%,
            transparent 32%
          );
          z-index: 2;
          pointer-events: none;
          display: none;
        }
        @media (min-width: 1024px) {
          .bc5-hero__veil {
            display: block;
          }
        }

        /* ─── WARM CINEMATIC TINT ────────────────────
           A very subtle warm amber wash at 5–6% opacity.
           OKLCH hue 70 (amber-gold) keeps colours in the
           warm ivory / champagne territory without going sepia.
           This is the "magazine warmth" layer.
        ─────────────────────────────────────────── */
        .bc5-hero__warm-tint {
          position: absolute;
          inset: 0;
          background: oklch(78% 0.12 72 / 0.06);
          mix-blend-mode: multiply;
          z-index: 3;
          pointer-events: none;
        }

        /* ─── VIGNETTE ───────────────────────────────
           Darkens the very edges of the image panel, drawing the
           eye inward toward the model. Radial gradient, transparent
           centre → soft dark perimeter at 30% opacity.
        ─────────────────────────────────────────── */
        .bc5-hero__vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 90% 90% at 65% 50%,
            transparent 45%,
            oklch(20% 0.01 60 / 0.22) 100%
          );
          z-index: 3;
          pointer-events: none;
        }

        /* ═══════════════════════════════════════════
           EYEBROW
        ═══════════════════════════════════════════ */
        .bc5-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-inter), sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--bc-gold-warm);
          margin: 0 0 var(--bc-space-6) 0;
          opacity: 0;
          animation: bc5-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .bc5-eyebrow__line {
          display: block;
          width: 2rem;
          height: 1px;
          background: var(--bc-gold-warm);
          flex-shrink: 0;
        }

        /* ═══════════════════════════════════════════
           HEADLINE
        ═══════════════════════════════════════════ */
        .bc5-headline {
          font-family: var(--font-playfair), serif;
          font-size: clamp(2.8rem, 5.5vw, 5.5rem);
          font-weight: 400;
          line-height: 1.06;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          margin: 0 0 var(--bc-space-6) 0;
          opacity: 0;
          animation: bc5-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
        }
        .bc5-headline__em {
          font-style: italic;
          font-weight: 400;
          color: var(--bc-brand-mauve);
        }

        /* ═══════════════════════════════════════════
           SUBLINE
        ═══════════════════════════════════════════ */
        .bc5-subline {
          font-family: var(--font-inter), sans-serif;
          font-size: clamp(0.9375rem, 1.1vw, 1.0625rem);
          font-weight: 300;
          line-height: 1.8;
          color: var(--bc-text-muted);
          max-width: 40ch;
          margin: 0 0 var(--bc-space-10) 0;
          opacity: 0;
          animation: bc5-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards;
        }

        /* ═══════════════════════════════════════════
           CTAs
        ═══════════════════════════════════════════ */
        .bc5-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: var(--bc-space-3);
          margin-bottom: var(--bc-space-12);
          opacity: 0;
          animation: bc5-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards;
        }
        .bc5-btn {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 2rem;
          border-radius: var(--bc-radius-full);
          transition:
            background-color var(--bc-transition-base),
            color var(--bc-transition-base),
            border-color var(--bc-transition-base),
            box-shadow var(--bc-transition-base);
          text-decoration: none;
        }
        .bc5-btn--primary {
          background-color: var(--bc-brand-mauve);
          color: var(--bc-text-inverse);
          border: 1px solid var(--bc-brand-mauve);
        }
        .bc5-btn--primary:hover {
          background-color: var(--bc-brand-mauve-dark);
          border-color: var(--bc-brand-mauve-dark);
          box-shadow: 0 4px 20px rgba(138, 90, 106, 0.28);
        }
        .bc5-btn--ghost {
          background-color: transparent;
          color: var(--bc-brand-mauve);
          border: 1px solid var(--bc-brand-mauve);
        }
        .bc5-btn--ghost:hover {
          background-color: var(--bc-brand-mauve);
          color: var(--bc-text-inverse);
        }

        /* ═══════════════════════════════════════════
           TRUST META
        ═══════════════════════════════════════════ */
        .bc5-meta {
          border-top: 1px solid var(--bc-border-soft);
          padding-top: var(--bc-space-6);
          opacity: 0;
          animation: bc5-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.1s forwards;
        }
        .bc5-meta__list {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--bc-space-2) var(--bc-space-6);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .bc5-meta__item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bc5-meta__value {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--bc-text-secondary);
          margin: 0;
          line-height: 1.2;
        }
        .bc5-meta__label {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.625rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--bc-text-faint);
        }
        .bc5-meta__sep {
          display: block;
          width: 1px;
          height: 1.75rem;
          background: var(--bc-border-gold);
          opacity: 0.5;
          align-self: center;
        }

        /* ═══════════════════════════════════════════
           SCROLL CUE
        ═══════════════════════════════════════════ */
        .bc5-scroll-cue {
          position: absolute;
          bottom: var(--bc-space-6);
          left: 50%;
          transform: translateX(-50%);
          color: var(--bc-brand-mauve);
          opacity: 0;
          z-index: 10;
          animation:
            bc5-fade-in  0.6s ease-out 2s forwards,
            bc5-bounce   1.8s ease-in-out 2.6s infinite;
        }
        @keyframes bc5-fade-in {
          to { opacity: 0.5; }
        }
        @keyframes bc5-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }

        /* ═══════════════════════════════════════════
           REVEAL ANIMATIONS
        ═══════════════════════════════════════════ */
        @keyframes bc5-fade-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ═══════════════════════════════════════════
           REDUCED MOTION
        ═══════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .bc5-eyebrow,
          .bc5-headline,
          .bc5-subline,
          .bc5-ctas,
          .bc5-meta {
            opacity: 1;
            animation: none;
            transform: none;
          }
          .bc5-scroll-cue {
            display: none;
          }
        }

      `}</style>
    </section>
  );
}
