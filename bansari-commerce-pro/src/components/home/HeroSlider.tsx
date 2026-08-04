/**
 * HeroSlider — client component.
 *
 * Accepts pre-fetched slides from the Hero server component.
 * Crossfade only (no sliding).
 * Pause on hover, swipe on mobile, keyboard left/right.
 *
 * Render window: only prev / current / next slides are mounted.
 * All others are unmounted to keep memory and network usage minimal.
 * When slides.length <= 3 the window covers all slides naturally.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HomepageCampaign } from '@/types/homepage-campaign';

const SLIDE_DURATION_MS = 5000;

interface Props {
  slides: HomepageCampaign[];
}

/** Returns the set of indices that should be mounted right now. */
function windowIndices(active: number, total: number): Set<number> {
  if (total <= 3) {
    return new Set(Array.from({ length: total }, (_, i) => i));
  }
  const prev = (active - 1 + total) % total;
  const next = (active + 1) % total;
  return new Set([prev, active, next]);
}

export function HeroSlider({ slides }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const advance = useCallback(
    (dir: 1 | -1 = 1) => {
      setActive((prev) => (prev + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1 || paused || reducedMotion) return;
    timerRef.current = setInterval(() => advance(1), SLIDE_DURATION_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, paused, reducedMotion, advance]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance(1);
      if (e.key === 'ArrowLeft') advance(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  const mounted = windowIndices(active, slides.length);
  const activeSlide = slides[active];

  return (
    <section
      aria-label={`Hero — ${activeSlide.title}`}
      className="bc4-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) advance(diff > 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {/* ── SLIDES — each contains its own image + text so everything crossfades together ── */}
      {slides.map((s, i) => {
        const isActive = i === active;

        // Only render DOM for prev/current/next; unmount all others
        if (!mounted.has(i)) return null;

        const imgPos =
          s.imagePosition === 'top' ? 'top'
            : s.imagePosition === 'bottom' ? 'bottom'
            : s.imagePosition === 'left' ? '20% center'
            : s.imagePosition === 'right' ? '80% center'
            : 'center';

        const textAlignClass =
          s.textAlignment === 'center'
            ? 'items-center text-center'
            : s.textAlignment === 'right'
            ? 'items-end text-right'
            : 'items-start text-left';

        const primaryClass =
          s.buttonStyle === 'outline' || s.buttonStyle === 'ghost'
            ? 'bc4-btn bc4-btn--ghost'
            : 'bc4-btn bc4-btn--primary';

        return (
          <div
            key={s.id}
            className="bc4-slide"
            aria-hidden={!isActive}
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            {/* ── Full-bleed grid: text left, image right ── */}
            <div className="bc4-hero__grid">
              {/* TEXT COLUMN — crossfades with slide */}
              <div
                className={`bc4-hero__text ${textAlignClass}`}
                role="group"
                aria-label="Hero content"
              >
                {/* Eyebrow — independent label, not duplicated in h1 */}
                {s.headlineLine1 && (
                  <p className="bc4-eyebrow" aria-label="Collection">
                    <span className="bc4-eyebrow__line" aria-hidden="true" />
                    {s.headlineLine1}
                  </p>
                )}

                {/* H1 — headlineHighlight + headlineLine2 only */}
                <h1 className="bc4-headline">
                  {s.headlineHighlight ? (
                    <em className="bc4-headline__em">{s.headlineHighlight}</em>
                  ) : null}
                  {s.headlineHighlight && s.headlineLine2 ? <br /> : null}
                  {s.headlineLine2 ?? null}
                  {/* Fallback: if only title, show title */}
                  {!s.headlineHighlight && !s.headlineLine2 ? s.title : null}
                </h1>

                {s.description && (
                  <p className="bc4-subline">{s.description}</p>
                )}

                {(s.ctaPrimaryText || s.ctaSecondaryText) && (
                  <div className="bc4-ctas">
                    {s.ctaPrimaryText && s.ctaPrimaryLink && (
                      <Link href={s.ctaPrimaryLink} className={primaryClass}>
                        {s.ctaPrimaryText}
                      </Link>
                    )}
                    {s.ctaSecondaryText && s.ctaSecondaryLink && (
                      <Link href={s.ctaSecondaryLink} className="bc4-btn bc4-btn--ghost">
                        {s.ctaSecondaryText}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* IMAGE COLUMN — crossfades with slide */}
              <div className="bc4-hero__image-wrap" aria-hidden="true">
                <div className="bc4-hero__veil" />
                {(s.desktopImage || s.tabletImage || s.mobileImage) && (
                  <Image
                    src={s.desktopImage || s.tabletImage || s.mobileImage}
                    alt={s.imageAlt || s.title}
                    fill
                    priority={i === 0}
                    loading={isActive ? 'eager' : 'lazy'}
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 55vw"
                    className="bc4-hero__img"
                    style={{ objectPosition: imgPos }}
                  />
                )}
                <div
                  className="bc4-hero__overlay"
                  style={{
                    backgroundColor: s.overlayColor,
                    opacity: s.overlayOpacity,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* ── DOTS ── */}
      {slides.length > 1 && (
        <div className="bc4-dots" role="tablist" aria-label="Campaign slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}: ${s.title}`}
              className={`bc4-dot${i === active ? ' bc4-dot--active' : ''}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}

      {/* ── SCROLL CUE ── */}
      <div className="bc4-scroll-cue" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── STYLES ── */}
      <style>{`
        /* SECTION */
        .bc4-hero {
          position: relative;
          overflow: hidden;
          background-color: var(--bc-surface-cream);
        }
        .bc4-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* SLIDES — absolutely stacked, full crossfade via opacity.
           Each slide contains its own image + text columns so both
           fade in/out together. */
        .bc4-slide {
          position: absolute;
          inset: 0;
          z-index: 2;
          transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* GRID — inside each slide */
        .bc4-hero__grid {
          display: grid;
          min-height: 100svh;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          position: relative;
          z-index: 10;
        }
        @media (min-width: 1024px) {
          .bc4-hero__grid {
            grid-template-columns: 45fr 55fr;
            grid-template-rows: 1fr;
          }
        }

        /* TEXT COLUMN */
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
          .bc4-hero__text { padding-left: clamp(4rem, 6vw, 7rem); }
        }

        /* IMAGE COLUMN */
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
            margin-right: calc(-1 * ((100vw - 100%) / 2));
          }
        }
        .bc4-hero__img {
          object-fit: cover;
        }
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
          .bc4-hero__veil { display: block; }
        }
        .bc4-hero__overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        /* EYEBROW */
        .bc4-eyebrow {
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
          animation: bc4-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .bc4-eyebrow__line {
          display: block;
          width: 2rem;
          height: 1px;
          background: var(--bc-gold-warm);
          flex-shrink: 0;
        }

        /* HEADLINE */
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

        /* SUBLINE */
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

        /* CTAs */
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
          transition: background-color var(--bc-transition-base), color var(--bc-transition-base),
                      border-color var(--bc-transition-base), box-shadow var(--bc-transition-base);
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
          box-shadow: 0 4px 20px rgba(138,90,106,0.28);
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

        /* DOTS */
        .bc4-dots {
          position: absolute;
          bottom: calc(var(--bc-space-6) + 28px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.4rem;
          z-index: 20;
        }
        .bc4-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          border: none;
          background: var(--bc-brand-mauve);
          opacity: 0.3;
          cursor: pointer;
          transition: opacity 0.2s, width 0.2s;
        }
        .bc4-dot--active {
          opacity: 1;
          width: 18px;
        }

        /* SCROLL CUE */
        .bc4-scroll-cue {
          position: absolute;
          bottom: var(--bc-space-6);
          left: 50%;
          transform: translateX(-50%);
          color: var(--bc-brand-mauve);
          opacity: 0;
          z-index: 10;
          animation: bc4-fade-in 0.6s ease-out 2s forwards, bc4-bounce 1.8s ease-in-out 2.6s infinite;
        }
        @keyframes bc4-fade-in { to { opacity: 0.5; } }
        @keyframes bc4-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }
        @keyframes bc4-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc4-eyebrow, .bc4-headline, .bc4-subline, .bc4-ctas {
            opacity: 1;
            animation: none;
            transform: none;
          }
          .bc4-slide { transition: none; }
        }
      `}</style>
    </section>
  );
}
