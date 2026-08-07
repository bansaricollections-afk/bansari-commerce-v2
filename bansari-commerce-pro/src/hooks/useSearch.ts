'use client';
// ─── Sprint 1 — useSearch hook ───────────────────────────────────────────────
// Central search hook consumed by InstantSearchOverlay and the search page.
// Reuses /api/search and /api/search/trending — does NOT create new endpoints.
import { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchProduct } from '@/types/search';

export interface Suggestion {
  query: string;
  type: 'recent' | 'trending' | 'popular';
}

export interface InstantResult {
  products: SearchProduct[];
  total: number;
}

const RECENT_KEY = 'bansari_recent_searches';
const MAX_RECENT = 8;

// ── localStorage helpers (graceful in SSR / private-mode) ─────────────────────
function readRecent(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null;
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

export function pushRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = readRecent().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  writeRecent([trimmed, ...existing]);
}

export function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

// ── highlight helper ──────────────────────────────────────────────────────────
/**
 * Returns an array of {text, highlight} segments so the UI can render
 * matched characters in the accent colour without dangerouslySetInnerHTML.
 */
export function highlightMatch(
  text: string,
  query: string,
): { text: string; highlight: boolean }[] {
  if (!query.trim()) return [{ text, highlight: false }];
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part) => ({
    text: part,
    highlight: regex.test(part),
  }));
}

// ── main hook ─────────────────────────────────────────────────────────────────
export interface UseSearchOptions {
  debounceMs?: number;
  instantResultsCount?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 280, instantResultsCount = 6 } = options;

  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [instantResults, setInstantResults] = useState<InstantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load trending on mount
  useEffect(() => {
    fetch('/api/search/trending')
      .then((r) => r.json())
      .then((data: { query: string }[]) => setTrending(data.map((d) => d.query)))
      .catch(() => {});
    setRecent(readRecent());
  }, []);

  // Build idle suggestions (no query typed)
  const buildIdleSuggestions = useCallback(
    (recentList: string[], trendingList: string[]): Suggestion[] => {
      const recentSugg: Suggestion[] = recentList
        .slice(0, 4)
        .map((q) => ({ query: q, type: 'recent' as const }));
      const trendingSugg: Suggestion[] = trendingList
        .filter((t) => !recentList.some((r) => r.toLowerCase() === t.toLowerCase()))
        .slice(0, 6)
        .map((q) => ({ query: q, type: 'trending' as const }));
      return [...recentSugg, ...trendingSugg];
    },
    [],
  );

  // Fetch instant results for a non-empty query
  const fetchInstant = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      if (q.trim().length < 2) {
        setInstantResults(null);
        setLoading(false);
        setSuggestions(buildIdleSuggestions(recent, trending));
        return;
      }

      setLoading(true);

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}&perPage=${instantResultsCount}`,
            { signal: controller.signal },
          );
          const data = await res.json();
          setInstantResults({
            products: data.products ?? [],
            total: data.meta?.total ?? 0,
          });
          // Build query-matched suggestions from trending
          const matched: Suggestion[] = trending
            .filter((t) => t.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 5)
            .map((t) => ({ query: t, type: 'popular' as const }));
          setSuggestions([{ query: q, type: 'popular' }, ...matched]);
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            setInstantResults(null);
          }
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [trending, recent, debounceMs, instantResultsCount, buildIdleSuggestions],
  );

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (q.trim() === '') {
        setInstantResults(null);
        setLoading(false);
        setSuggestions(buildIdleSuggestions(recent, trending));
      } else {
        fetchInstant(q);
      }
    },
    [fetchInstant, buildIdleSuggestions, recent, trending],
  );

  const openIdle = useCallback(() => {
    setSuggestions(buildIdleSuggestions(readRecent(), trending));
    setRecent(readRecent());
  }, [trending, buildIdleSuggestions]);

  /** Call after a successful search navigation */
  const recordSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    pushRecent(trimmed);
    setRecent(readRecent());
    // Fire-and-forget analytics
    fetch('/api/search/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: trimmed }),
    }).catch(() => {});
  }, []);

  const removeRecent = useCallback((q: string) => {
    const updated = readRecent().filter((r) => r !== q);
    writeRecent(updated);
    setRecent(updated);
    setSuggestions(buildIdleSuggestions(updated, trending));
  }, [trending, buildIdleSuggestions]);

  return {
    query,
    setQuery,
    suggestions,
    instantResults,
    loading,
    trending,
    recent,
    openIdle,
    recordSearch,
    removeRecent,
  };
}
