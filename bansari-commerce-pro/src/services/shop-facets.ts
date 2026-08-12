/**
 * src/services/shop-facets.ts
 *
 * Single source of truth for storefront filter options.
 *
 * Every option is derived from the live catalog, so a filter control can
 * never offer a value that returns zero products. Values are used verbatim
 * (never slugified, never trimmed) because getFilteredProducts matches the
 * stored string exactly.
 *
 * Shared by /shop, /search, the site Header, the MobileMenu and the Footer, so
 * no customer-facing surface can diverge from the catalog. Previously each
 * surface hardcoded its own list and they had all drifted.
 *
 * Wrapped in React `cache()` so the several consumers that may render in one
 * request (Header + Footer + page) share a single database round-trip.
 */

import { cache } from 'react';

import { createServiceRoleClient } from '@/lib/supabase/service';
import type { ShopFacets } from '@/components/shop/FilterSidebar';

export type { ShopFacets };

const EMPTY: ShopFacets = {
  categories: [], collections: [], fabrics: [], colors: [], sizes: [], occasions: [],
};

// ─── Real filter facets ──────────────────────────────────────────────────────
// Every filter option is derived from the active catalog, so the sidebar can
// never offer a value that returns zero products. Values are used verbatim
// because getFilteredProducts matches the stored string exactly.
//
// This replaces four independently hardcoded option lists that had drifted
// from the catalog entirely (Sarees, Lehengas, Gowns, Ethnic Dresses...).
export const getShopFacets = cache(async function getShopFacets(): Promise<ShopFacets> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("products")
      .select("category, collection, fabric, color, sizes, specifications")
      .eq("active", true);

    if (error || !data) return EMPTY;

    const uniq = (values: (string | null | undefined)[]) =>
      [...new Set(values.filter((v): v is string => typeof v === "string" && v.trim().length > 0))]
        .sort((a, b) => a.localeCompare(b));

    const sizes = new Set<string>();
    const occasions = new Set<string>();
    for (const row of data) {
      const rowSizes: unknown = row.sizes;
      if (Array.isArray(rowSizes)) {
        for (const s of rowSizes) {
          if (typeof s === "string" && s.trim()) sizes.add(s.trim());
        }
      }
      // specifications.occasion is stored either as a string or a string[]
      // depending on the product. getFilteredProducts matches it with
      // `ilike specifications->>occasion`, which works for both shapes.
      const occasion = (row.specifications as Record<string, unknown> | null)?.occasion;
      const occasionValues = Array.isArray(occasion) ? occasion : [occasion];
      for (const o of occasionValues) {
        if (typeof o === "string" && o.trim()) occasions.add(o.trim());
      }
    }

    // Canonical garment-size order first; anything unrecognised keeps A–Z order.
    const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
    const rank = (s: string) => {
      const i = SIZE_ORDER.indexOf(s.toUpperCase());
      return i === -1 ? SIZE_ORDER.length : i;
    };

    return {
      categories:  uniq(data.map((r) => r.category as string | null)),
      collections: uniq(data.map((r) => r.collection as string | null)),
      fabrics:     uniq(data.map((r) => r.fabric as string | null)),
      colors:      uniq(data.map((r) => r.color as string | null)),
      sizes:       [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)),
      occasions:   [...occasions].sort((a, b) => a.localeCompare(b)),
    };
  } catch {
    // A facet failure must not take the page down — the grid still works,
    // the sidebar simply renders no options rather than fabricated ones.
    return EMPTY;
  }
});
