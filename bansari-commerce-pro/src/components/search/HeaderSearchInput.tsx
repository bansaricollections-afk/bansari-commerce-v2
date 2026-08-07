'use client';
// ─── Sprint 1 — HeaderSearchInput (upgraded) ─────────────────────────────
// Replaces the bare inline overlay with InstantSearchOverlay.
// Single trigger button → opens InstantSearchOverlay.
// Route change auto-closes.
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy-load the overlay so it does not bloat the header bundle
const InstantSearchOverlay = dynamic(
  () => import('@/components/search/InstantSearchOverlay'),
  { ssr: false },
);

export default function HeaderSearchInput() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        aria-label="Open search"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center text-slate-700
                   hover:text-[#8A5A6A] transition-colors focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-[#8A5A6A] rounded-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Instant search overlay (lazy-loaded) */}
      <InstantSearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
