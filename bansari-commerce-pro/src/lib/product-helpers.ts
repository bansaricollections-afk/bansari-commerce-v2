/**
 * Product Management 2.0 — Reusable Helper Utilities
 */
import type {
  ProductImageV2,
  InventorySummary,
  ProductVariantV2,
} from '@/types/product-v2';

// ============================================================
// SLUG
// ============================================================

/**
 * Generate a URL-safe slug from any string.
 * e.g. "Bansari Silk Saree!" => "bansari-silk-saree"
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate that a slug contains only lowercase letters, numbers, hyphens.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ============================================================
// SKU
// ============================================================

/**
 * Generate a candidate SKU from product name + size label.
 * e.g. "Silk Saree", "M" => "BSR-SILK-M-1234"
 */
export function generateSku(productName: string, sizeLabel?: string): string {
  const prefix = 'BSR';
  const namePart = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const sizePart = sizeLabel ? `-${sizeLabel.toUpperCase()}` : '';
  const rand = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${prefix}-${namePart}${sizePart}-${rand}`;
}

/**
 * Validate a SKU: 3–40 chars, alphanumeric + dash.
 */
export function isValidSku(sku: string): boolean {
  return /^[A-Za-z0-9-]{3,40}$/.test(sku);
}

// ============================================================
// PRICE
// ============================================================

/**
 * Returns true when mrp >= sellingPrice >= 0.
 */
export function isPricingValid(mrp: number, sellingPrice: number): boolean {
  return mrp >= 0 && sellingPrice >= 0 && mrp >= sellingPrice;
}

/**
 * Calculate discount percentage rounded to 0 decimal places.
 */
export function discountPercent(mrp: number, sellingPrice: number): number {
  if (mrp <= 0) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

// ============================================================
// INVENTORY
// ============================================================

/**
 * Derive InventorySummary from an array of ProductVariantV2.
 */
export function calculateInventory(
  variants: ProductVariantV2[]
): InventorySummary {
  let totalStock = 0;
  let totalReserved = 0;
  let activeVariants = 0;
  let outOfStockVariants = 0;

  for (const v of variants) {
    totalStock += v.stock;
    totalReserved += v.reservedStock;
    if (v.status === 'active') activeVariants++;
    if (v.status === 'out_of_stock' || v.stock === 0) outOfStockVariants++;
  }

  return {
    totalStock,
    totalReserved,
    availableStock: totalStock - totalReserved,
    variantCount: variants.length,
    activeVariants,
    outOfStockVariants,
  };
}

// ============================================================
// IMAGES
// ============================================================

/**
 * Sort images: primary first, then gallery, then zoom, all by sort_order.
 */
export function sortImages(images: ProductImageV2[]): ProductImageV2[] {
  const order: Record<string, number> = { primary: 0, gallery: 1, zoom: 2 };
  return [...images].sort((a, b) => {
    const typeOrder =
      (order[a.imageType] ?? 99) - (order[b.imageType] ?? 99);
    if (typeOrder !== 0) return typeOrder;
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * Returns true if all image URLs in the array are unique.
 */
export function hasNoDuplicateImageUrls(images: { url: string }[]): boolean {
  const urls = images.map((i) => i.url);
  return new Set(urls).size === urls.length;
}

// ============================================================
// SEO
// ============================================================

/**
 * Build a canonical SEO meta object with safe fallbacks.
 */
export function buildSeoMeta(product: {
  name: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  slug: string;
}) {
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.name,
    keywords: product.seoKeywords
      ? product.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [],
    canonical:
      product.canonicalUrl ||
      `/products/${product.slug}`,
  };
}
