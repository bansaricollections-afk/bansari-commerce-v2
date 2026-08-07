/**
 * src/lib/recentlyViewed.ts
 *
 * Canonical, pure-TypeScript utility for recently-viewed product tracking.
 *
 * Rules:
 *   - Key : 'recently_viewed'  (matches existing RecentlyViewed.tsx live data)
 *   - Shape: RecentItem[]  (full lightweight product snapshot, NOT id-only)
 *   - Max  : 20 items
 *   - Order: most-recent first; duplicate ids are moved to front
 *   - SSR  : every sessionStorage access is guarded by typeof window check
 *   - Zero module-level side effects
 */

export interface RecentItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category?: string;
}

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 20;

// ─── Internal helpers ──────────────────────────────────────────────────────

function isRecentItem(value: unknown): value is RecentItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    typeof v.price === 'number' &&
    typeof v.image === 'string'
  );
}

function readStorage(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentItem);
  } catch {
    return [];
  }
}

function writeStorage(items: RecentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // QuotaExceededError or security restriction — silent fail
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Record a product view.
 * - Moves the product to the front if already present (no duplicate).
 * - Trims the list to MAX_ITEMS after insertion.
 * - No-op on SSR.
 */
export function trackRecentlyViewed(
  product: Pick<RecentItem, 'id' | 'name' | 'price' | 'image' | 'category'>
): void {
  if (!product || typeof product.id !== 'number') return;

  const existing = readStorage();
  // Remove any existing entry for this id, then prepend fresh snapshot
  const deduped = existing.filter((item) => item.id !== product.id);
  const next: RecentItem[] = [
    {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      ...(product.category !== undefined && { category: product.category }),
    },
    ...deduped,
  ].slice(0, MAX_ITEMS);

  writeStorage(next);
}

/**
 * Return the current list of recently-viewed products.
 * Always returns a new array. Safe to call on SSR (returns []).
 */
export function getRecentlyViewed(): RecentItem[] {
  return readStorage();
}

/**
 * Clear all recently-viewed data. Useful for testing or user opt-out.
 * No-op on SSR.
 */
export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}
