"use client";

import { useEffect, useState } from "react";

const KEY = "bc_recently_viewed";
const MAX = 6;

/**
 * Tracks recently viewed product IDs in sessionStorage.
 * Returns the ordered list of IDs (most recent first).
 */
export function useRecentlyViewed(currentProductId?: number) {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const parsed: number[] = raw ? JSON.parse(raw) : [];
      const filtered = currentProductId
        ? parsed.filter((id) => id !== currentProductId)
        : parsed;
      setIds(filtered);

      if (currentProductId !== undefined) {
        const next = [currentProductId, ...filtered].slice(0, MAX);
        sessionStorage.setItem(KEY, JSON.stringify(next));
      }
    } catch {
      /* sessionStorage unavailable — no-op */
    }
   
  }, [currentProductId]);

  return ids;
}
