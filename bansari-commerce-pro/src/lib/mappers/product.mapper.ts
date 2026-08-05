/**
 * product.mapper.ts
 *
 * Single source of truth for mapping raw Supabase product rows
 * into the canonical Product type consumed by the UI.
 *
 * Image pipeline fix:
 *   Raw DB stores images as image_urls JSONB array OR image_url string.
 *   Both forms are normalised into Product.images[] here so ProductCard
 *   never receives an empty or undefined images array.
 */

import type { Product } from '@/types';

// Shape returned by Supabase product queries
export interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  sku?: string | null;
  barcode?: string | null;
  category_id?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  subcategory_id?: string | null;
  brand?: string | null;
  tags?: string[] | null;
  // Image sources — any of these may be populated
  image_url?: string | null;
  image_urls?: string[] | string | null;  // JSONB — may arrive as array or stringified
  images?: string[] | null;
  // Inventory
  stock_quantity?: number | null;
  track_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  weight?: number | null;
  weight_unit?: string | null;
  // Status
  is_active?: boolean | null;
  is_featured?: boolean | null;
  is_new_arrival?: boolean | null;
  // Meta
  meta_title?: string | null;
  meta_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Variant support
  variants?: unknown[] | null;
  attributes?: Record<string, unknown> | null;
  // Rating
  average_rating?: number | null;
  review_count?: number | null;
}

/**
 * Resolves the image array from a raw product row.
 * Priority: images[] > image_urls (JSONB) > image_url (legacy string)
 * Returns an empty array if no images are present — never undefined.
 */
export function resolveProductImages(raw: RawProduct): string[] {
  // 1. images[] already populated
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    return raw.images.filter(Boolean) as string[];
  }

  // 2. image_urls — may arrive as JSON array or stringified JSON
  if (raw.image_urls) {
    if (Array.isArray(raw.image_urls) && raw.image_urls.length > 0) {
      return raw.image_urls.filter(Boolean) as string[];
    }
    if (typeof raw.image_urls === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw.image_urls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return (parsed as string[]).filter(Boolean);
        }
        // Treat as a bare URL string
        if (typeof parsed === 'string' && parsed.trim()) {
          return [parsed.trim()];
        }
      } catch {
        // Not JSON — treat the raw string itself as the URL
        if (raw.image_urls.trim()) {
          return [raw.image_urls.trim()];
        }
      }
    }
  }

  // 3. Legacy single image_url column
  if (raw.image_url && raw.image_url.trim()) {
    return [raw.image_url.trim()];
  }

  return [];
}

/**
 * Maps a single raw Supabase product row to the canonical Product type.
 */
export function mapRawProductToProduct(raw: RawProduct): Product {
  const images = resolveProductImages(raw);

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? '',
    price: raw.price,
    compareAtPrice: raw.compare_at_price ?? undefined,
    costPrice: raw.cost_price ?? undefined,
    sku: raw.sku ?? undefined,
    barcode: raw.barcode ?? undefined,
    categoryId: raw.category_id ?? undefined,
    category: raw.category ?? undefined,
    subcategoryId: raw.subcategory_id ?? undefined,
    brand: raw.brand ?? undefined,
    tags: raw.tags ?? [],
    // Resolved images — never undefined
    images,
    image: images[0] ?? '',
    // Inventory
    stockQuantity: raw.stock_quantity ?? 0,
    trackInventory: raw.track_inventory ?? false,
    allowBackorder: raw.allow_backorder ?? false,
    weight: raw.weight ?? undefined,
    weightUnit: raw.weight_unit ?? undefined,
    // Status
    isActive: raw.is_active ?? true,
    isFeatured: raw.is_featured ?? false,
    isNewArrival: raw.is_new_arrival ?? false,
    // Meta
    metaTitle: raw.meta_title ?? undefined,
    metaDescription: raw.meta_description ?? undefined,
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
    // Rating
    averageRating: raw.average_rating ?? undefined,
    reviewCount: raw.review_count ?? undefined,
  };
}

/**
 * Maps an array of raw products.
 */
export function mapRawProductsToProducts(rows: RawProduct[]): Product[] {
  return rows.map(mapRawProductToProduct);
}
