"use client";

import Image from "next/image";
import Link from "next/link";

/* -----------------------------------------------------------------------
   HERO — LUXURY EDITORIAL v3
   Benchmark: 40% Massimo Dutti · 20% COS · 30% Aza Fashions · 10% Pernia's

   Desktop composition
   ─────────────────────────────────────────────────────────────────────
   [ LEFT: text content, left-aligned, breathing room ][ RIGHT: image, flush to viewport edge ]

   The right column bleeds to the edge of the viewport — no max-width clip.
   The left column is padded as normal. This creates the editorial asymmetry
   that Massimo Dutti and COS use to signal premium intent.

   Mobile
   ─────────────────────────────────────────────────────────────────────
   Image first (full viewport width, 65vw tall) → text below.
   No hero image cropping — object-position: center center preserves drape.

   Image
   ─────────────────────────────────────────────────────────────────────
   Premium ethnic fashion editorial. Rich crimson silk saree with gold zari.
   Sourced from Unsplash (free to use commercially).
   next.config must have images.remotePatterns allowing images.unsplash.com
----------------------------------------------------------------------- */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1400&q=90";

export default function Hero() {
  return (
    <section
      aria-label="Hero"
      className="bc-hero relative overflow-hidden"
      style={{ backgroundColor: "var(--bc-surface-cream)" }}
    >
      {/* ── GRID WRAPPER ── */}
      <div className="bc-hero__grid">

        {/* ── LEFT: EDITORIAL TEXT ── */}
        <div className="bc-hero__text">

          {/* Eyebrow */}
          <p className="bc-hero__eyebrow">
            The 2026 Edit
          </p>

          {/* Headline */}
          <h1 className="bc-hero__headline">
            Where Tradition
            <br />
            <em className="bc-hero__headline-em">Meets Timeless</em>
            <br />
            Style
          </h1>

          {/* Body */}
          <p className="bc-hero__body">
            Discover thoughtfully crafted ethnic wear designed for weddings,
            celebrations, festive occasions and everyday elegance.
          </p>

          {/* CTAs */}
          <div className="bc-hero__ctas">
            <Link href="/shop" className="bc-hero__cta-primary">
              Shop The Edit
            </Link>
            <Link href="/collections" className="bc-hero__cta-ghost">
              Explore Collections
            </Link>
          </div>

          {/* Trust metadata */}
          <div className="bc-hero__meta">
            <dl aria-label="Brand credentials" className="bc-hero__meta-list">
              <div className="bc-hero__meta-item">
                <dd className="bc-hero__meta-value">500+</dd>
                <dt className="bc-hero__meta-label">Curated Styles</dt>
              </div>
              <span aria-hidden="true" className="bc-hero__meta-dot">·</span>
              <div className="bc-hero__meta-item">
                <dd className="bc-hero__meta-value">Quality Assured</dd>
                <dt className="bc-hero__meta-label">Every Piece</dt>
              </div>
              <span aria-hidden="true" className="bc-hero__meta-dot">·</span>
              <div className="bc-hero__meta-item">
                <dd className="bc-hero__meta-value">Pan-India</dd>
                <dt className="bc-hero__meta-label">Delivery</dt>
              </div>
            </dl>
          </div>

        </div>

        {/* ── RIGHT: IMAGE ── */}
        <div className="bc-hero__image-wrap" aria-hidden="true">
          <Image
            src={HERO_IMAGE}
            alt="Bansari Collections — premium ethnic saree in rich crimson and gold zari"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
            className="bc-hero__image"
          />
          {/* Subtle left-edge gradient so text never clashes with image on resize */}
          <div className="bc-hero__image-gradient" aria-hidden="true" />
        </div>

      </div>

      {/* ── SCROLL CUE ── */}
      <div className="bc-hero__scroll-cue" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── STYLES ── */}
      <style>{`
        /* ── Layout ── */
        .bc-hero {
          min-height: 100svh;
        }
        .bc-hero__grid {
          display: grid;
          min-height: 100svh;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
        }
        @media (min-width: 1024px) {
          .bc-hero__grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr;
          }
        }

        /* ── Left: text ── */
        .bc-hero__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(3rem, 6vw, 6rem) clamp(1.5rem, 5vw, 5rem);
          padding-top: clamp(5rem, 10vw, 8rem);
          order: 2;
          max-width: 640px;
        }
        @media (min-width: 1024px) {
          .bc-hero__text {
            order: 1;
            padding-top: clamp(5rem, 8vw, 7rem);
          }
        }

        /* ── Right: image ── */
        .bc-hero__image-wrap {
          position: relative;
          min-height: 65vw;
          order: 1;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .bc-hero__image-wrap {
            order: 2;
            min-height: 100svh;
            margin-right: calc(-1 * ((100vw - 100%) / 2));
          }
        }
        .bc-hero__image {
          object-fit: cover;
          object-position: center center;
        }
        .bc-hero__image-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--bc-surface-cream) 0%,
            transparent 15%
          );
          pointer-events: none;
        }
        @media (min-width: 1024px) {
          .bc-hero__image-gradient {
            display: none;
          }
        }

        /* ── Eyebrow ── */
        .bc-hero__eyebrow {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--bc-gold-warm);
          margin-bottom: var(--bc-space-5);
        }

        /* ── Headline ── */
        .bc-hero__headline {
          font-family: var(--font-playfair), serif;
          font-size: var(--bc-text-3xl);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.01em;
          color: var(--bc-text-primary);
          margin: 0 0 var(--bc-space-6) 0;
        }
        .bc-hero__headline-em {
          font-style: italic;
          font-weight: 400;
          color: var(--bc-brand-mauve);
        }

        /* ── Body ── */
        .bc-hero__body {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-base);
          line-height: 1.75;
          color: var(--bc-text-muted);
          max-width: 42ch;
          margin-bottom: var(--bc-space-10);
        }

        /* ── CTAs ── */
        .bc-hero__ctas {
          display: flex;
          flex-wrap: wrap;
          gap: var(--bc-space-3);
          margin-bottom: var(--bc-space-10);
        }
        .bc-hero__cta-primary {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--bc-text-inverse);
          background-color: var(--bc-brand-mauve);
          border: 1px solid var(--bc-brand-mauve);
          padding: 0.875rem 2.25rem;
          border-radius: var(--bc-radius-full);
          display: inline-flex;
          align-items: center;
          transition: background-color var(--bc-transition-base), border-color var(--bc-transition-base);
        }
        .bc-hero__cta-primary:hover {
          background-color: var(--bc-brand-mauve-dark);
          border-color: var(--bc-brand-mauve-dark);
        }
        .bc-hero__cta-ghost {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--bc-brand-mauve);
          background-color: transparent;
          border: 1px solid var(--bc-brand-mauve);
          padding: 0.875rem 2.25rem;
          border-radius: var(--bc-radius-full);
          display: inline-flex;
          align-items: center;
          transition: background-color var(--bc-transition-base);
        }
        .bc-hero__cta-ghost:hover {
          background-color: var(--bc-brand-mauve-faint);
        }

        /* ── Trust metadata ── */
        .bc-hero__meta {
          border-top: 1px solid var(--bc-border-soft);
          padding-top: var(--bc-space-6);
        }
        .bc-hero__meta-list {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: var(--bc-space-2) var(--bc-space-5);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .bc-hero__meta-item {
          display: flex;
          align-items: baseline;
          gap: var(--bc-space-1);
        }
        .bc-hero__meta-value {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-sm);
          font-weight: 500;
          color: var(--bc-text-secondary);
          margin: 0;
        }
        .bc-hero__meta-label {
          font-family: var(--font-inter), sans-serif;
          font-size: var(--bc-text-xs);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bc-text-faint);
        }
        .bc-hero__meta-dot {
          color: var(--bc-border-gold);
          font-size: var(--bc-text-sm);
          line-height: 1;
          user-select: none;
        }

        /* ── Scroll cue ── */
        .bc-hero__scroll-cue {
          position: absolute;
          bottom: var(--bc-space-6);
          left: 50%;
          transform: translateX(-50%);
          color: var(--bc-brand-mauve);
          opacity: 0;
          animation: bc-scroll-cue-fade 1s ease-out 1.8s forwards,
                     bc-scroll-cue-bounce 1.6s ease-in-out 2.8s infinite;
        }
        @keyframes bc-scroll-cue-fade {
          to { opacity: 0.55; }
        }
        @keyframes bc-scroll-cue-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-hero__scroll-cue { display: none; }
        }
      `}</style>
    </section>
  );
}
