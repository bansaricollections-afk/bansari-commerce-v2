'use client';
// ─── Sprint 9C — SearchInput (client component) ───────────────────────────────
// Keyboard-navigable combobox with:
//  • Debounced live search (300 ms)
//  • Trending suggestions when idle
//  • Keyboard: ArrowUp/Down navigate, Enter submits, Escape closes
//  • ARIA combobox role for screen readers
//  • Mobile-safe (touch targets ≥44px)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  query: string;
  type: 'trending' | 'live';
}

interface SearchInputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Pre-filled value (e.g. from URL searchParams) */
  defaultValue?: string;
  /** Extra CSS classes for the wrapper */
  className?: string;
}

export default function SearchInput({
  placeholder = 'Search… kurta, saree, lehenga',
  defaultValue = '',
  className = '',
}: SearchInputProps) {
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const [value,       setValue]       = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [trending,    setTrending]    = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending on mount
  useEffect(() => {
    fetch('/api/search/trending')
      .then((r) => r.json())
      .then((data: { query: string }[]) =>
        setTrending(data.map((d) => d.query))
      )
      .catch(() => {});
  }, []);

  // Debounced live suggestions
  const fetchLive = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions(trending.map((t) => ({ query: t, type: 'trending' })));
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&perPage=5`);
        const data: { meta: { query: string } } = await res.json();
        // Surface only the query echo + trending as suggestions
        // (product results rendered on the search page itself)
        const live: Suggestion[] = [{ query: data.meta.query, type: 'live' }];
        const topTrending = trending
          .filter((t) => t.toLowerCase().startsWith(q.toLowerCase()))
          .slice(0, 4)
          .map((t): Suggestion => ({ query: t, type: 'trending' }));
        setSuggestions([...live, ...topTrending]);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, [trending]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    setOpen(true);
    if (q.trim() === '') {
      setSuggestions(trending.map((t) => ({ query: t, type: 'trending' })));
    } else {
      fetchLive(q);
    }
  }

  function handleFocus() {
    setOpen(true);
    if (value.trim() === '') {
      setSuggestions(trending.map((t) => ({ query: t, type: 'trending' })));
    }
  }

  function handleBlur(e: React.FocusEvent) {
    // Only close if focus moves outside the widget
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          setValue(suggestions[activeIdx].query);
          submit(suggestions[activeIdx].query);
        } else {
          submit(value);
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIdx(-1);
        inputRef.current?.blur();
        break;
    }
  }

  const listId = 'search-suggestions';

  return (
    <div
      className={`relative ${className}`}
      onBlur={handleBlur}
    >
      {/* Combobox input */}
      <div className="relative flex items-center">
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
          aria-expanded={open && suggestions.length > 0}
          aria-activedescendant={
            activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined
          }
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full rounded-none border border-slate-200 bg-white py-2 pl-10 pr-12
                     text-sm text-slate-900 placeholder:text-slate-400
                     focus:border-[#8A5A6A] focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/20
                     transition-colors duration-150"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setValue(''); setSuggestions(trending.map((t) => ({ query: t, type: 'trending' }))); inputRef.current?.focus(); }}
            className="absolute right-10 flex h-6 w-6 items-center justify-center text-slate-400 hover:text-slate-600"
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
          aria-label="Search"
          onClick={() => submit(value)}
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

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-0.5 border border-slate-200
                     bg-white shadow-lg"
        >
          {suggestions[0]?.type === 'trending' && (
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
              Trending
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={`${s.query}-${i}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                setValue(s.query);
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
              {s.type === 'trending' ? (
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
              <span>{s.query}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
