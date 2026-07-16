"use client";

import { Search, X } from "lucide-react";
import { useState, useRef } from "react";

const TRENDING = ["Wedding saree", "Kurta set", "Lehenga", "Festive gown", "Co-ord set"];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSuggestions = focused && query.length === 0;
  const showResults = focused && query.length > 0;

  return (
    <div className="relative w-full max-w-xs" role="search">
      <label htmlFor="shop-search" className="sr-only">
        Search products
      </label>

      <div className="flex items-center border border-slate-200 bg-white transition focus-within:border-[#8A5A6A]">
        <Search size={14} className="ml-3 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          id="shop-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search…"
          autoComplete="off"
          className="h-9 flex-1 bg-transparent px-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="mr-2 text-slate-400 transition hover:text-slate-700"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Trending suggestions */}
      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 border border-slate-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Trending searches"
        >
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Trending
          </p>
          {TRENDING.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => setQuery(t)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none"
            >
              <Search size={12} className="text-slate-300" aria-hidden="true" />
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Live result hint */}
      {showResults && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 border border-slate-200 bg-white p-4 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs text-slate-500">
            Searching for <strong className="text-slate-900">&ldquo;{query}&rdquo;</strong>…
          </p>
        </div>
      )}
    </div>
  );
}
