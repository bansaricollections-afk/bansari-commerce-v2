'use client';
// ─── Sprint 9C — HeaderSearchInput ─────────────────────────────────────────────
// Compact search button in the Header that expands to an overlay SearchInput.
// Self-contained client component — no server state needed.
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function HeaderSearchInput() {
  const [open,  setOpen]  = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); setValue(''); }, [pathname]);

  // Auto-focus when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Escape to close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setValue(''); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function submit() {
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
    setValue('');
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        aria-label="Open search"
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

      {/* Full-width overlay search bar */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => { setOpen(false); setValue(''); }}
            aria-hidden="true"
          />
          {/* Search bar */}
          <div className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white shadow-lg">
            <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
              <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                placeholder="Search… kurta, saree, lehenga"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                  if (e.key === 'Escape') { setOpen(false); setValue(''); }
                }}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent py-1 text-sm text-slate-900
                           placeholder:text-slate-400 focus:outline-none"
              />
              {value && (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => { setValue(''); inputRef.current?.focus(); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                className="rounded-none bg-[#8A5A6A] px-4 py-1.5 text-[11px] font-semibold
                           uppercase tracking-widest text-white hover:bg-[#7a4e5e]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[#8A5A6A]"
              >
                Search
              </button>
              <button
                type="button"
                aria-label="Close search"
                onClick={() => { setOpen(false); setValue(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
