"use client";

import { useEffect, useRef, useState } from "react";

/** Options for configuring scroll-reveal behaviour. */
export interface UseScrollRevealOptions {
  /**
   * Fraction of the element that must be visible before the reveal fires.
   * Accepts a single number or an array of thresholds.
   * @default 0.15
   */
  threshold?: number | number[];

  /**
   * Margin around the root used to grow or shrink the intersection area.
   * Follows CSS shorthand syntax (e.g. "0px 0px -64px 0px").
   * @default "0px"
   */
  rootMargin?: string;

  /**
   * When true the observer disconnects after the first intersection,
   * so the reveal animation only plays once.
   * @default true
   */
  once?: boolean;
}

/**
 * Attaches an IntersectionObserver to the returned ref and reports
 * whether the element is currently visible in the viewport.
 *
 * Automatically:
 * - Respects `prefers-reduced-motion`: returns `isVisible: true`
 *   immediately so no animation is triggered.
 * - Disconnects the observer on component unmount.
 * - Disconnects after the first intersection when `once` is true.
 *
 * @example
 * ```tsx
 * const { ref, isVisible } = useScrollReveal({ threshold: 0.2, once: true });
 * return (
 *   <div
 *     ref={ref}
 *     className={isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
 *   />
 * );
 * ```
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px", once = true } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Immediately resolve as visible when the user prefers reduced motion.
    // This means CSS classes that depend on isVisible will start in their
    // final state, producing no animation.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect immediately after first reveal when `once` is true.
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          // Only reset visibility when `once` is false (repeating reveals).
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    // Cleanup: disconnect observer when component unmounts or options change.
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isVisible } as const;
}
