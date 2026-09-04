'use client';

import { useEffect, useState } from 'react';

/**
 * Thin gold reading-progress rail across the top of an article.
 *
 * Editorial long-form convention: it gives the reader a sense of commitment
 * ("how much is left") without a word count. Deliberately 2px and gold — it
 * should register peripherally, never compete with the page.
 *
 * Respects prefers-reduced-motion by dropping the width transition; the bar
 * still tracks position, it just does not animate between frames.
 */
export default function ArticleProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setPct(scrollable <= 0 ? 0 : Math.min(100, (window.scrollY / scrollable) * 100));
    };

    // rAF-throttled: scroll fires far more often than we need to paint.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 h-[2px]"
      style={{ zIndex: 'var(--bc-z-sticky)' }}
      aria-hidden="true"
    >
      <div
        className="h-full origin-left"
        style={{
          width: `${pct}%`,
          background: 'var(--bc-gold)',
          transition: 'width 120ms linear',
        }}
      />
    </div>
  );
}
