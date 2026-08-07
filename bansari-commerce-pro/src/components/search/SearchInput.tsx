'use client';
// ─── Sprint 4 Batch 1 — SearchInput (unified onto useSearch) ─────────────────
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch, highlightMatch } from '@/hooks/useSearch';

interface SearchInputProps {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

// ── Highlighted suggestion text ───────────────────────────────────────────────
function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
  return (
    <span>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark key={i} className="bg-transparent font-semibold text-[#8A5A6A]">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

export default function SearchInput({
  placeholder = 'Search… kurta, saree, lehenga',
  defaultValue = '',
  className = '',
}: SearchInputProps) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Shared hook — all search state lives here ───────────────────────────
  const {
    query,
    setQuery,
    suggestions,
    loading,
    recordSearch,
  } = useSearch({ debounceMs: 250, instantResultsCount: 5 });

  // ── Keyboard highlight index — React state so mutations trigger re-renders ─
  // Previously this was a useRef + broken forceUpdate() call. useRef mutations
  // do not schedule re-renders; the highlighted row and aria-activedescendant
  // therefore never updated. useState(-1) is the correct pattern.
  const [activeIdx, setActiveIdx] = useState(-1);

  // Reset highlight whenever the suggestion list changes (new query, cleared, etc.)
  useEffect(() => {
    setActiveIdx(-1);
  }, [suggestions]);

  // Scroll the highlighted item into view AFTER the state update has
  // committed to the DOM (useEffect runs post-paint).
  useEffect(() => {
    if (activeIdx >= 0) {
      document
        .getElementById(`si-suggestion-${activeIdx}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  // Initialise value from defaultValue on first render only
  const initialisedRef = useRef(false);

  // ── Navigation helper ─────────────────────────────────────────────────
  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    recordSearch(trimmed);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  // ── Keyboard handler ─────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // setActiveIdx triggers re-render; scrollIntoView handled by useEffect
        setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          const picked = suggestions[activeIdx].query;
          setQuery(picked);
          setActiveIdx(-1);
          submit(picked);
        } else {
          submit(query);
        }
        break;
      case 'Escape':
        setQuery('');
        setActiveIdx(-1);
        inputRef.current?.blur();
        break;
    }
  }

  const open   = suggestions.length > 0;
  const listId = 'si-suggestions';

  return (
    <div
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setActiveIdx(-1);
        }
      }}
    >
      {/* ── Combobox input ── */}
      <div className="relative flex items-center">
        {/* Search icon */}
        <span className="pointer-events-none absolute left-3 text-slate-400" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeIdx >= 0 ? `si-suggestion-${activeIdx}` : undefined}
          value={query || defaultValue}
          onChange={(e) => {
            initialisedRef.current = true;
            setQuery(e.target.value);
            setActiveIdx(-1);
          }}
          onFocus={() => {
            if (!initialisedRef.current && defaultValue) {
              setQuery(defaultValue);
              initialisedRef.current = true;
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full rounded-none border border-slate-200 bg-white py-2 pl-10 pr-12
                     text-sm text-slate-900 placeholder:text-slate-400
                     focus:border-[#8A5A6A] focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/20
                     transition-colors duration-150"
        />

        {/* Loading spinner */}
        {loading && (
          <span
            className="absolute right-12 h-4 w-4 animate-spin rounded-full border-2 border-[#8A5A6A]/30 border-t-[#8A5A6A]"
            aria-label="Loading suggestions"
          />
        )}

        {/* Clear button */}
        {(query || defaultValue) && !loading && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setActiveIdx(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-10 flex h-6 w-6 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Submit button */}
        <button
          type="button"
          aria-label="Search"
          onClick={() => submit(query || defaultValue)}
          className="absolute right-0 flex h-11 w-11 items-center justify-center
                     bg-[#8A5A6A] text-white hover:bg-[#7a4e5e] active:bg-[#6a3f50]
                     transition-colors duration-150 focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* ── Suggestions dropdown ── */}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-0.5 border border-slate-200
                     bg-white shadow-lg"
        >
          {suggestions[0]?.type === 'trending' || suggestions[0]?.type === 'recent' ? (
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
              {suggestions[0]?.type === 'recent' ? 'Recent' : 'Trending'}
            </li>
          ) : null}

          {suggestions.map((s, i) => (
            <li
              key={`${s.query}-${i}`}
              id={`si-suggestion-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                // preventDefault keeps focus on the input while the click registers
                e.preventDefault();
                setQuery(s.query);
                setActiveIdx(-1);
                submit(s.query);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm
                          transition-colors duration-75
                          ${
                            i === activeIdx
                              ? 'bg-[#8A5A6A]/10 text-[#8A5A6A]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
            >
              {s.type === 'recent' ? (
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              )}
              <HighlightedText text={s.query} query={query} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
