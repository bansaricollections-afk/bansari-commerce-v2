"use client";

import Image from "next/image";
import Link from "next/link";

/* -----------------------------------------------------------------------
   HERO — LUXURY EDITORIAL v4 "The Darbar"
   ─────────────────────────────────────────────────────────────────────
   Benchmark: Sabyasachi · Aza Fashions · Dior · Hermès · Net-a-Porter

   Concept:
   A palace durbar in golden-hour light. A woman in couture ethnic wear
   commands the right half of the frame. Text breathes on ivory to the left.
   The image is never cropped — the composition is intentional.

   Desktop (≥1024px)
   ─────────────────────────────────────────────────────────────────────
   Left  45%  Editorial text, top-aligned with generous padding
   Right 55%  Full-height image, flush to right viewport edge
   An ivory-to-transparent gradient bridges the join so text is always legible.

   Mobile (<1024px)
   ─────────────────────────────────────────────────────────────────────
   Image first, 70svh tall, full viewport width.
   Text below. No crop. No squeeze.
----------------------------------------------------------------------- */

const HERO_IMAGE =
  "https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=1600&h=2400&dpr=1";

export default function Hero() {
  return (
    <section
      aria-label="Hero — Bansari Collections 2026 Couture Edit"
      className="bc4-hero"
    >
      {/* ── FULL-BLEED GRID ── */}
      <div className="bc4-hero__grid">

        {/* ── LEFT: TEXT ── */}
        <div className="bc4-hero__text" role="group" aria-label="Hero content">

          {/* Eyebrow label */}
          <p className="bc4-eyebrow" aria-label="Collection season">
            <span className="bc4-eyebrow__line" aria-hidden="true" />
            The 2026 Couture Edit
          </p>

          {/* Main headline */}
          <h1 className="bc4-headline">
            Where Heritage
            <br />
            <em className="bc4-headline__em">Becomes</em>
            <br />
            Your Story
          </h1>

          {/* Subline */}
          <p className="bc4-subline">
            Couture ethnic wear for weddings, festivities and every
            chapter of celebration — crafted for the modern Indian woman.
          </p>

          {/* CTAs */}
          <div className="bc4-ctas">
            <Link href="/shop" className="bc4-btn bc4-btn--primary">
              Shop The Edit
            </Link>
            <Link href="/collections" className="bc4-btn bc4-btn--ghost">
              View Collections
            </Link>
          </div>

          {/* Trust metadata */}
          <div className="bc4-meta">
            <dl className="bc4-meta__list">
              <div className="bc4-meta__item">
                <dd className="bc4-meta__value">500+</dd>
                <dt className="bc4-meta__label">Curated Styles</dt>
              </div>
              <span className="bc4-meta__sep" aria-hidden="true" />
              <div className="bc4-meta__item">
                <dd className="bc4-meta__value">Artisan</dd>
                <dt className="bc4-meta__label">Crafted</dt>
              </div>
              <span className="bc4-meta__sep" aria-hidden="true" />
              <div className="bc4-meta__item">
                <dd className="bc4-meta__value">Pan-India</dd>
                <dt className="bc4-meta__label">Delivery</dt>
              </div>
            </dl>
          </div>
        </div>

        {/* ── RIGHT: IMAGE ── */}
        <div className="bc4-hero__image-wrap" aria-hidden="true">
          {/* Gradient veil — left ivory fade to prevent text/image collision */}
          <div className="bc4-hero__veil" />

          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 58vw"
            className="bc4-hero__img"
          />
        </div>
      </div>

      {/* ── SCROLL CUE ── */}
      <div className="bc4-scroll-cue" aria-hidden="true">
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
        .bc4-hero {
          position: relative;
          overflow: hidden;
          background-color: var(--bc-surface-cream);
          /* Very subtle warm grain texture via pseudo-element below */
        }
        .bc4-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* ═══════════════════════════════════════════
           GRID
        ═══════════════════════════════════════════ */
        .bc4-hero__grid {
          display: grid;
          min-height: 100svh;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          position: relative;
          z-index: 2;
        }
        @media (min-width: 1024px) {
          .bc4-hero__grid {
            grid-template-columns: 45fr 55fr;
            grid-template-rows: 1fr;
          }
        }

        /* ═══════════════════════════════════════════
           TEXT COLUMN
        ═══════════════════════════════════════════ */
        .bc4-hero__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(5rem, 10vw, 7rem) clamp(1.5rem, 5vw, 4.5rem)
                   clamp(3rem, 6vw, 5rem)  clamp(1.5rem, 5vw, 4.5rem);
          order: 2;
          position: relative;
          z-index: 3;
        }
        @media (min-width: 1024px) {
          .bc4-hero__text {
            order: 1;
            padding-left: clamp(2.5rem, 5vw, 5rem);
            padding-right: clamp(2rem, 4vw, 4rem);
          }
        }
        @media (min-width: 1440px) {
          .bc4-hero__text {
            padding-left: clamp(4rem, 6vw, 7rem);
          }
        }

        /* ═══════════════════════════════════════════
           IMAGE COLUMN
        ═══════════════════════════════════════════ */
        .bc4-hero__image-wrap {
          position: relative;
          min-height: 70svh;
          order: 1;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .bc4-hero__image-wrap {
            order: 2;
            min-height: 100svh;
            /* Bleed to viewport right edge — no max-width clip */
            margin-right: calc(-1 * ((100vw - 100%) / 2));
          }
        }
        .bc4-hero__img {
          object-fit: cover;
          /* 20% from left keeps the figure centred; never crops face */
          object-position: 20% center;
        }
        @media (max-width: 1023px) {
          .bc4-hero__img {
            object-position: center top;
          }
        }

        /* Ivory veil — desktop only, left edge of image column */
        .bc4-hero__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--bc-surface-cream) 0%,
            color-mix(in oklab, var(--bc-surface-cream) 40%, transparent) 18%,
            transparent 35%
          );
          z-index: 2;
          pointer-events: none;
          display: none;
        }
        @media (min-width: 1024px) {
          .bc4-hero__veil {
            display: block;
          }
        }

        /* ═══════════════════════════════════════════
           EYEBROW
        ═══════════════════════════════════════════ */
        .bc4-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-inter), sans-serif;
          font-size: 0.6875rem;  /* 11px — intentionally intimate */
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--bc-gold-warm);
          margin: 0 0 var(--bc-space-6) 0;
          opacity: 0;
          animation: bc4-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .bc4-eyebrow__line {
          display: block;
          width: 2rem;
          height: 1px;
          background: var(--bc-gold-warm);
          flex-shrink: 0;
        }

        /* ═══════════════════════════════════════════
           HEADLINE
        ═══════════════════════════════════════════ */
        .bc4-headline {
          font-family: var(--font-playfair), serif;
          font-size: clamp(2.8rem, 5.5vw, 5.5rem);
          font-weight: 400;
          line-height: 1.06;
          letter-spacing: -0.015em;
          color: var(--bc-text-primary);
          margin: 0 0 var(--bc-space-6) 0;
          opacity: 0;
          animation: bc4-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
        }
        .bc4-headline__em {
          font-style: italic;
          font-weight: 400;
          color: var(--bc-brand-mauve);
        }

        /* ═══════════════════════════════════════════
           SUBLINE
        ═══════════════════════════════════════════ */
        .bc4-subline {
          font-family: var(--font-inter), sans-serif;
          font-size: clamp(0.9375rem, 1.1vw, 1.0625rem);
          font-weight: 300;
          line-height: 1.8;
          color: var(--bc-text-muted);
          max-width: 40ch;
          margin: 0 0 var(--bc-space-10) 0;
          opacity: 0;
          animation: bc4-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards;
        }

        /* ═══════════════════════════════════════════
           CTAs
        ═══════════════════════════════════════════ */
        .bc4-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: var(--bc-space-3);
          margin-bottom: var(--bc-space-12);
          opacity: 0;
          animation: bc4-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards;
        }
        .bc4-btn {
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
        .bc4-btn--primary {
          background-color: var(--bc-brand-mauve);
          color: var(--bc-text-inverse);
          border: 1px solid var(--bc-brand-mauve);
        }
        .bc4-btn--primary:hover {
          background-color: var(--bc-brand-mauve-dark);
          border-color: var(--bc-brand-mauve-dark);
          box-shadow: 0 4px 20px rgba(138, 90, 106, 0.28);
        }
        .bc4-btn--ghost {
          background-color: transparent;
          color: var(--bc-brand-mauve);
          border: 1px solid var(--bc-brand-mauve);
        }
        .bc4-btn--ghost:hover {
          background-color: var(--bc-brand-mauve);
          color: var(--bc-text-inverse);
        }

        /* ═══════════════════════════════════════════
           TRUST META
        ═══════════════════════════════════════════ */
        .bc4-meta {
          border-top: 1px solid var(--bc-border-soft);
          padding-top: var(--bc-space-6);
          opacity: 0;
          animation: bc4-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.1s forwards;
        }
        .bc4-meta__list {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--bc-space-2) var(--bc-space-6);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .bc4-meta__item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bc4-meta__value {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--bc-text-secondary);
          margin: 0;
          line-height: 1.2;
        }
        .bc4-meta__label {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.625rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--bc-text-faint);
        }
        .bc4-meta__sep {
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
        .bc4-scroll-cue {
          position: absolute;
          bottom: var(--bc-space-6);
          left: 50%;
          transform: translateX(-50%);
          color: var(--bc-brand-mauve);
          opacity: 0;
          z-index: 10;
          animation:
            bc4-fade-in  0.6s ease-out 2s forwards,
            bc4-bounce   1.8s ease-in-out 2.6s infinite;
        }
        @keyframes bc4-fade-in {
          to { opacity: 0.5; }
        }
        @keyframes bc4-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }

        /* ═══════════════════════════════════════════
           REVEAL ANIMATIONS
        ═══════════════════════════════════════════ */
        @keyframes bc4-fade-up {
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
          .bc4-eyebrow,
          .bc4-headline,
          .bc4-subline,
          .bc4-ctas,
          .bc4-meta {
            opacity: 1;
            animation: none;
            transform: none;
          }
          .bc4-scroll-cue {
            display: none;
          }
        }

      `}</style>
    </section>
  );
}
