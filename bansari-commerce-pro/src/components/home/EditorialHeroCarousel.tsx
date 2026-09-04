"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

export interface HeroSlide {
  id: number;
  campaign: string;
  headline: string;
  subheadline: string;
  cta: string;
  ctaHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
  image: string;
  imageAlt: string;
  accent: string;
  position: "left" | "center" | "right";
}

const INTERVAL = 6000;

/**
 * Directional scrim, keyed to where the copy actually sits.
 *
 * The previous scrim darkened the LEFT of every frame at 0.82 and never fell
 * below 0.18 anywhere, plus a second 0.70 bottom wash — so the photograph was
 * dimmed edge to edge even on slides whose copy sits right or centre. Here the
 * darkening is held high only under the copy and decays to clean image by
 * ~70% across, which keeps text contrast while letting the garment dominate.
 */
function copyScrim(position: HeroSlide["position"]): string {
  if (position === "center") {
    return (
      "radial-gradient(115% 90% at 50% 68%, rgba(26,15,22,0.72) 0%, " +
      "rgba(26,15,22,0.52) 32%, rgba(26,15,22,0.16) 60%, transparent 82%)"
    );
  }
  const direction = position === "right" ? "to left" : "to right";
  return (
    `linear-gradient(${direction}, rgba(26,15,22,0.80) 0%, ` +
    "rgba(26,15,22,0.70) 26%, rgba(26,15,22,0.34) 48%, " +
    "rgba(26,15,22,0.06) 66%, transparent 78%)"
  );
}

/** Shared foot scrim — anchors the frame without flattening the image. */
const FOOT_SCRIM =
  "linear-gradient(to top, rgba(26,15,22,0.45) 0%, rgba(26,15,22,0.10) 28%, transparent 52%)";

export default function EditorialHeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetProgress = useCallback(() => {
    setProgress(0);
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress(p => Math.min(p + 100 / (INTERVAL / 60), 100));
    }, 60);
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      if (transitioning || idx === current) return;
      setTransitioning(true);
      setCurrent(idx);
      resetProgress();
      setTimeout(() => setTransitioning(false), 900);
    },
    [current, transitioning, resetProgress]
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    resetProgress();
    // A single-slide hero has nothing to rotate to.
    if (slides.length > 1) {
      timer.current = setInterval(next, INTERVAL);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [next, resetProgress, slides.length]);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section
      aria-label="Featured campaigns"
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        minHeight: "600px",
        maxHeight: "1000px",
        overflow: "hidden",
        background: "var(--bc-dark)",
      }}
    >
      {/* ── Image layer ── */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === current ? 1 : 0,
            transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1)",
            zIndex: i === current ? 1 : 0,
          }}
        >
          <Image
            src={s.image}
            alt={s.imageAlt}
            fill
            priority={i === 0}
            /*
             * PageSpeed identified this carousel's first slide as the LCP
             * element and flagged that no `fetchpriority=high` was present —
             * `priority` alone produced an eager <img> and a preload, but the
             * browser still had no signal to fetch it ahead of the other ~130
             * images on the page. Set explicitly rather than relying on
             * `priority` to imply it.
             */
            fetchPriority={i === 0 ? 'high' : 'auto'}
            sizes="100vw"
            style={{
              objectFit: "cover",
              // Pulled off the very top edge so a full-length garment is not
              // cropped flush at the crown — reads as a composed frame.
              objectPosition: "50% 22%",
              animation: i === current ? "bc-ken-burns 7s ease-out forwards" : "none",
            }}
          />
          {/* Scrim: held under the copy, released across the image */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `${copyScrim(s.position)}, ${FOOT_SCRIM}`,
            }}
          />
        </div>
      ))}

      {/* ── Content ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: slide.position === "right" ? "flex-end" : slide.position === "center" ? "center" : "flex-start",
          padding: "clamp(2rem, 6vw, 6rem)",
          paddingBottom: "clamp(5rem, 10vw, 8rem)",
        }}
      >
        <div
          style={{
            maxWidth: "min(620px, 90vw)",
            textAlign: slide.position === "center" ? "center" : "left",
            display: "flex",
            flexDirection: "column",
            alignItems: slide.position === "center" ? "center" : "flex-start",
            animation: "bc-fade-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          {/* Campaign label */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ display: "block", width: "2.5rem", height: "1px", background: "var(--bc-gold)" }} />
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "0.6875rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--bc-gold-light)",
                fontWeight: 500,
              }}
            >
              {slide.campaign}
            </span>
            <span style={{ width: "2.5rem", height: "1px", background: "var(--bc-gold)", display: slide.position === "center" ? "block" : "none" }} />
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              fontWeight: 500,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: "var(--bc-cream)",
              whiteSpace: "pre-line",
              maxWidth: "16ch",
              textShadow: "0 1px 24px rgba(26,15,22,0.35)",
              margin: "1.25rem 0 0",
            }}
          >
            {slide.headline}
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(0.9375rem, 1.1vw, 1.125rem)",
              lineHeight: 1.6,
              color: "rgba(255,253,249,0.86)",
              fontWeight: 300,
              maxWidth: "40ch",
              margin: "1rem 0 0",
            }}
          >
            {slide.subheadline}
          </p>

          {/* CTAs — primary (solid gold) and secondary (1px ghost) share one
              height rhythm so the pair reads as a considered lockup. The
              semantic hierarchy is unchanged: gold fill leads, ghost follows,
              and both destinations are untouched. */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: "2rem",
            }}
          >
            <Link
              href={slide.ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "var(--bc-gold)",
                color: "var(--bc-dark)",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "clamp(0.875rem, 0.8rem + 0.25vw, 1.0625rem)",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                minHeight: "clamp(3.5rem, 3.25rem + 1vw, 3.75rem)",
                padding: "0 clamp(2.25rem, 1.75rem + 1.5vw, 3rem)",
                transition: "all var(--bc-base-t)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bc-gold-light)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bc-gold)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {slide.cta}
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {slide.secondaryCta && (
              <Link
                href={slide.secondaryHref!}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  color: "rgba(255,253,249,0.92)",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "clamp(0.875rem, 0.8rem + 0.25vw, 1.0625rem)",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(255,253,249,0.45)",
                  background: "transparent",
                  minHeight: "clamp(3.5rem, 3.25rem + 1vw, 3.75rem)",
                  padding: "0 clamp(2rem, 1.5rem + 1.5vw, 2.75rem)",
                  transition: "all var(--bc-base-t)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--bc-cream)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,253,249,0.10)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,253,249,0.45)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {slide.secondaryCta}
              </Link>
            )}
          </div>

          {/*
           * The accent tag ("category · collection") is deliberately not
           * rendered: the campaign eyebrow already shows the category and the
           * headline already shows the collection, so it restated the same two
           * strings a third time. Kept on HeroSlide so the data contract with
           * EditorialHero is unchanged.
           */}
        </div>
      </div>

      {/* ── Slide indicators + counter — only meaningful with 2+ slides ── */}
      {slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(1.5rem, 3vw, 2.5rem)",
            left: "clamp(2rem, 6vw, 6rem)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === current ? "3rem" : "1.25rem",
                height: "2px",
                background: i === current ? "var(--bc-gold)" : "rgba(255,253,249,0.30)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 400ms ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {i === current && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${progress}%`,
                    background: "var(--bc-cream)",
                    opacity: 0.5,
                  }}
                />
              )}
            </button>
          ))}

          <span
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "0.6875rem",
              letterSpacing: "0.12em",
              color: "rgba(255,253,249,0.45)",
              marginLeft: "0.5rem",
            }}
          >
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* ── Scroll cue ── */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(1.5rem, 3vw, 2.5rem)",
          right: "clamp(2rem, 6vw, 6rem)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.625rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,253,249,0.35)",
            writingMode: "vertical-rl",
          }}
        >
          Scroll
        </span>
        <svg
          width="14"
          height="28"
          viewBox="0 0 14 28"
          fill="none"
          style={{ opacity: 0.35 }}
        >
          <rect x="1" y="1" width="12" height="20" rx="6" stroke="white" strokeWidth="1" />
          <rect
            x="6"
            y="5"
            width="2"
            height="5"
            rx="1"
            fill="white"
            style={{
              animation: "bc-fade-up 1.6s ease-in-out infinite alternate",
            }}
          />
        </svg>
      </div>

      {/* ── Side nav arrows — only with 2+ slides ── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            style={{
              position: "absolute",
              left: "1.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "2.75rem",
              height: "2.75rem",
              border: "1px solid rgba(255,253,249,0.18)",
              background: "rgba(26,15,22,0.4)",
              color: "rgba(255,253,249,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--bc-base-t)",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bc-gold)";
              (e.currentTarget as HTMLElement).style.color = "var(--bc-dark)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--bc-gold)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(26,15,22,0.4)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,253,249,0.7)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,253,249,0.18)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => goTo((current + 1) % slides.length)}
            aria-label="Next slide"
            style={{
              position: "absolute",
              right: "1.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "2.75rem",
              height: "2.75rem",
              border: "1px solid rgba(255,253,249,0.18)",
              background: "rgba(26,15,22,0.4)",
              color: "rgba(255,253,249,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--bc-base-t)",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bc-gold)";
              (e.currentTarget as HTMLElement).style.color = "var(--bc-dark)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--bc-gold)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(26,15,22,0.4)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,253,249,0.7)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,253,249,0.18)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
