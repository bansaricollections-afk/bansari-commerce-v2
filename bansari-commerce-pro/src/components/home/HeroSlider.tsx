'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HomepageCampaign } from '@/types/homepage-campaign';

const SLIDE_DURATION_MS = 6000;

interface Props { slides: HomepageCampaign[]; }

function windowIndices(active: number, total: number): Set<number> {
  if (total <= 3) return new Set(Array.from({ length: total }, (_, i) => i));
  return new Set([(active - 1 + total) % total, active, (active + 1) % total]);
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
      setActive(prev => (prev + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1 || paused || reducedMotion) return;
    timerRef.current = setInterval(() => advance(1), SLIDE_DURATION_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, paused, reducedMotion, advance]);

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
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) advance(diff > 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {slides.map((s, i) => {
        if (!mounted.has(i)) return null;
        const isActive = i === active;

        const imgPos =
          s.imagePosition === 'top' ? 'center top'
          : s.imagePosition === 'bottom' ? 'center bottom'
          : s.imagePosition === 'left' ? '20% center'
          : s.imagePosition === 'right' ? '80% center'
          : 'center 20%';

        const textAlignClass =
          s.textAlignment === 'center' ? 'items-center text-center'
          : s.textAlignment === 'right' ? 'items-end text-right'
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
            style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
          >
            <div className="bc4-hero__grid">
              <div
                className={`bc4-hero__text ${textAlignClass}`}
                role="group"
                aria-label="Hero content"
              >
                {s.headlineLine1 && (
                  <p className="bc4-eyebrow" aria-label="Collection">
                    <span className="bc4-eyebrow__line" aria-hidden="true" />
                    {s.headlineLine1}
                  </p>
                )}
                <h1 className="bc4-headline">
                  {s.headlineHighlight
                    ? <em className="bc4-headline__em">{s.headlineHighlight}</em>
                    : null}
                  {s.headlineHighlight && s.headlineLine2 ? <br /> : null}
                  {s.headlineLine2 ?? null}
                  {!s.headlineHighlight && !s.headlineLine2 ? s.title : null}
                </h1>
                {s.description && <p className="bc4-subline">{s.description}</p>}
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

              <div className="bc4-hero__image-wrap" aria-hidden="true">
                <div className="bc4-hero__veil" />
                {(s.desktopImage || s.tabletImage || s.mobileImage) && (
                  <Image
                    src={s.desktopImage || s.tabletImage || s.mobileImage}
                    alt={s.imageAlt || s.title}
                    fill
                    priority={i === 0}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 55vw"
                    className="bc4-hero__img"
                    style={{ objectPosition: imgPos }}
                  />
                )}
                <div
                  className="bc4-hero__overlay"
                  style={{ backgroundColor: s.overlayColor, opacity: s.overlayOpacity }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      {slides.length > 1 && !paused && !reducedMotion && (
        <div className="bc4-progress" aria-hidden="true">
          <div
            key={active}
            className="bc4-progress__bar"
            style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
          />
        </div>
      )}

      {/* Dots */}
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

      {/* Scroll cue */}
      <div className="bc4-scroll-cue" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
          <path d="M8 10.5l4 4 4-4" stroke="currentColor" strokeWidth="1.25"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        .bc4-hero {
          position: relative;
          overflow: hidden;
          background-color: var(--bc-surface-cream);
          min-height: 100svh;
        }
        .bc4-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        .bc4-slide {
          position: absolute;
          inset: 0;
          z-index: 2;
          transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity;
        }

        .bc4-hero__grid {
          display: grid;
          min-height: 100svh;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr auto;
          position: relative;
          z-index: 10;
        }
        @media (min-width: 1024px) {
          .bc4-hero__grid {
            grid-template-columns: 45fr 55fr;
            grid-template-rows: 1fr;
          }
        }

        .bc4-hero__text {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: clamp(6rem, 12vw, 8rem) clamp(1.5rem, 5vw, 4.5rem)
                   clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4.5rem);
          order: 2;
          position: relative;
          z-index: 3;
          background: linear-gradient(to top,
            var(--bc-surface-cream) 0%,
            color-mix(in oklab, var(--bc-surface-cream) 95%, transparent) 60%,
            color-mix(in oklab, var(--bc-surface-cream) 60%, transparent) 100%
          );
        }
        @media (min-width: 1024px) {
          .bc4-hero__text {
            order: 1;
            justify-content: center;
            background: none;
            padding-left: clamp(3rem, 5.5vw, 6rem);
            padding-right: clamp(2rem, 4vw, 4rem);
            padding-top: 0;
            padding-bottom: 0;
          }
        }
        @media (min-width: 1440px) {
          .bc4-hero__text { padding-left: clamp(5rem, 7vw, 8rem); }
        }

        .bc4-hero__image-wrap {
          position: relative;
          min-height: clamp(55svh, 60svh, 70svh);
          order: 1;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .bc4-hero__image-wrap {
            order: 2;
            min-height: 100svh;
          }
        }
        .bc4-hero__img {
          object-fit: cover;
          transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .bc4-slide[aria-hidden="false"] .bc4-hero__img { transform: scale(1.03); }
        .bc4-slide[aria-hidden="true"] .bc4-hero__img { transform: scale(1); }
        .bc4-hero__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--bc-surface-cream) 0%,
            color-mix(in oklab, var(--bc-surface-cream) 35%, transparent) 20%,
            transparent 38%
          );
          z-index: 2;
          pointer-events: none;
          display: none;
        }
        @media (min-width: 1024px) { .bc4-hero__veil { display: block; } }
        .bc4-hero__overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        .bc4-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          font-family: var(--font-inter), sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: var(--bc-gold-warm);
          margin: 0 0 var(--bc-space-5) 0;
          opacity: 0;
          animation: bc4-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .bc4-eyebrow__line {
          display: block;
          width: 2.5rem;
          height: 1px;
          background: currentColor;
          flex-shrink: 0;
        }

        .bc4-headline {
          font-family: var(--font-playfair), serif;
          font-size: clamp(2.6rem, 5.2vw, 5.2rem);
          font-weight: 400;
          line-height: 1.04;
          letter-spacing: -0.02em;
          color: var(--bc-text-primary);
          margin: 0 0 var(--bc-space-5) 0;
          opacity: 0;
          animation: bc4-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.42s forwards;
        }
        .bc4-headline__em {
          font-style: italic;
          font-weight: 400;
          color: var(--bc-brand-mauve);
        }

        .bc4-subline {
          font-family: var(--font-inter), sans-serif;
          font-size: clamp(0.875rem, 1vw, 1rem);
          font-weight: 300;
          line-height: 1.85;
          color: var(--bc-text-muted);
          max-width: 38ch;
          margin: 0 0 var(--bc-space-8) 0;
          opacity: 0;
          animation: bc4-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.68s forwards;
        }

        .bc4-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: var(--bc-space-3);
          opacity: 0;
          animation: bc4-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.88s forwards;
        }
        .bc4-btn {
          font-family: var(--font-inter), sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 48px;
          padding: 0 2.25rem;
          border-radius: var(--bc-radius-full);
          transition:
            background-color 220ms cubic-bezier(0.16,1,0.3,1),
            color 220ms cubic-bezier(0.16,1,0.3,1),
            border-color 220ms cubic-bezier(0.16,1,0.3,1),
            box-shadow 220ms cubic-bezier(0.16,1,0.3,1),
            transform 220ms cubic-bezier(0.16,1,0.3,1);
          text-decoration: none;
          cursor: pointer;
        }
        .bc4-btn:hover { transform: translateY(-1px); }
        .bc4-btn:active { transform: translateY(0); }
        .bc4-btn--primary {
          background-color: var(--bc-brand-mauve);
          color: #fff;
          border: 1px solid var(--bc-brand-mauve);
        }
        .bc4-btn--primary:hover {
          background-color: var(--bc-brand-mauve-dark);
          border-color: var(--bc-brand-mauve-dark);
          box-shadow: 0 6px 24px color-mix(in oklab, var(--bc-brand-mauve) 35%, transparent);
        }
        .bc4-btn--ghost {
          background-color: transparent;
          color: var(--bc-brand-mauve);
          border: 1px solid color-mix(in oklab, var(--bc-brand-mauve) 55%, transparent);
        }
        .bc4-btn--ghost:hover {
          background-color: var(--bc-brand-mauve);
          color: #fff;
          border-color: var(--bc-brand-mauve);
        }

        .bc4-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: color-mix(in oklab, var(--bc-brand-mauve) 15%, transparent);
          z-index: 30;
          overflow: hidden;
        }
        .bc4-progress__bar {
          height: 100%;
          width: 100%;
          background: var(--bc-brand-mauve);
          transform-origin: left;
          animation: bc4-progress linear forwards;
        }
        @keyframes bc4-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        .bc4-dots {
          position: absolute;
          bottom: var(--bc-space-7);
          left: clamp(1.5rem, 5vw, 4.5rem);
          display: flex;
          gap: 0.5rem;
          z-index: 20;
        }
        @media (min-width: 1024px) {
          .bc4-dots { left: clamp(3rem, 5.5vw, 6rem); }
        }
        .bc4-dot {
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          border: none;
          background: var(--bc-brand-mauve);
          opacity: 0.25;
          cursor: pointer;
          transition: opacity 300ms ease, width 300ms ease;
        }
        .bc4-dot--active { opacity: 1; width: 22px; }

        .bc4-scroll-cue {
          position: absolute;
          bottom: var(--bc-space-7);
          right: clamp(1.5rem, 5vw, 4.5rem);
          color: var(--bc-brand-mauve);
          opacity: 0;
          z-index: 20;
          animation:
            bc4-fade-in 0.6s ease-out 2.2s forwards,
            bc4-float 2.4s ease-in-out 2.8s infinite;
        }
        @keyframes bc4-fade-in { to { opacity: 0.55; } }
        @keyframes bc4-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
        @keyframes bc4-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bc4-eyebrow, .bc4-headline, .bc4-subline, .bc4-ctas {
            opacity: 1; animation: none; transform: none;
          }
          .bc4-slide { transition: none; }
          .bc4-hero__img { transition: none; }
          .bc4-progress__bar { animation: none; }
          .bc4-scroll-cue { opacity: 0.55; animation: none; }
        }
      `}</style>
    </section>
  );
}
