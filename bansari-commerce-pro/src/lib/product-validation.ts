/**
 * Product Management 2.0 — Validation Layer
 *
 * Pure functions. No Supabase calls here (uniqueness checks live in the service).
 * Zod is NOT a required dependency — we validate with typed predicate functions
 * to avoid adding a new package.
 */
import type {
  CreateProductV2Payload,
  CreateVariantPayload,
  ProductValidationError,
} from '@/types/product-v2';
import {
  isValidSlug,
  isValidSku,
  isPricingValid,
  hasNoDuplicateImageUrls,
} from '@/lib/product-helpers';

// ============================================================
// PRODUCT VALIDATION
// ============================================================

export function validateProductPayload(
  payload: Partial<CreateProductV2Payload>
): ProductValidationError[] {
  const errors: ProductValidationError[] = [];

  if (!payload.name || payload.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Product name is required.', code: 'NAME_REQUIRED' });
  }

  if (!payload.slug || payload.slug.trim().length === 0) {
    errors.push({ field: 'slug', message: 'Slug is required.', code: 'SLUG_REQUIRED' });
  } else if (!isValidSlug(payload.slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must contain only lowercase letters, numbers, and hyphens.',
      code: 'SLUG_REQUIRED',
    });
  }

  if (!payload.sku || payload.sku.trim().length === 0) {
    errors.push({ field: 'sku', message: 'SKU is required.', code: 'SKU_REQUIRED' });
  } else if (!isValidSku(payload.sku)) {
    errors.push({
      field: 'sku',
      message: 'SKU must be 3–40 characters (letters, numbers, hyphens).',
      code: 'SKU_REQUIRED',
    });
  }

  if (!payload.category || payload.category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Category is required.', code: 'CATEGORY_REQUIRED' });
  }

  if (payload.price === undefined || payload.price === null) {
    errors.push({ field: 'price', message: 'Price is required.', code: 'PRICE_INVALID' });
  } else if (payload.price < 0) {
    errors.push({ field: 'price', message: 'Price cannot be negative.', code: 'PRICE_INVALID' });
  }

  if (
    payload.compare_price !== undefined &&
    payload.compare_price !== null &&
    payload.price !== undefined &&
    payload.price !== null &&
    payload.compare_price < payload.price
  ) {
    errors.push({
      field: 'compare_price',
      message: 'Compare price (MRP) must be ≥ selling price.',
      code: 'MRP_BELOW_SELLING',
    });
  }

  if (payload.images && !hasNoDuplicateImageUrls(payload.images.filter((i): i is { url: string } => typeof i.url === 'string'))) {
    errors.push({
      field: 'images',
      message: 'Duplicate image URLs are not allowed.',
      code: 'IMAGE_DUPLICATE_URL',
    });
  }

  return errors;
}

// ============================================================
// VARIANT VALIDATION
// ============================================================

export function validateVariantPayload(
  payload: Partial<CreateVariantPayload>
): ProductValidationError[] {
  const errors: ProductValidationError[] = [];

  if (!payload.sku || payload.sku.trim().length === 0) {
    errors.push({ field: 'sku', message: 'Variant SKU is required.', code: 'SKU_REQUIRED' });
  } else if (!isValidSku(payload.sku)) {
    errors.push({
      field: 'sku',
      message: 'Variant SKU must be 3–40 characters (letters, numbers, hyphens).',
      code: 'SKU_REQUIRED',
    });
  }

  if (payload.mrp === undefined || payload.mrp < 0) {
    errors.push({ field: 'mrp', message: 'MRP must be ≥ 0.', code: 'PRICE_INVALID' });
  }

  if (payload.selling_price === undefined || payload.selling_price < 0) {
    errors.push({ field: 'selling_price', message: 'Selling price must be ≥ 0.', code: 'PRICE_INVALID' });
  }

  if (
    payload.mrp !== undefined &&
    payload.selling_price !== undefined &&
    !isPricingValid(payload.mrp, payload.selling_price)
  ) {
    errors.push({
      field: 'selling_price',
      message: 'Selling price must be ≤ MRP.',
      code: 'MRP_BELOW_SELLING',
    });
  }

  if (payload.stock !== undefined && payload.stock < 0) {
    errors.push({ field: 'stock', message: 'Stock cannot be negative.', code: 'STOCK_NEGATIVE' });
  }

  if (
    payload.reserved_stock !== undefined &&
    payload.stock !== undefined &&
    payload.reserved_stock > payload.stock
  ) {
    errors.push({
      field: 'reserved_stock',
      message: 'Reserved stock cannot exceed total stock.',
      code: 'RESERVED_EXCEEDS_STOCK',
    });
  }

  return errors;
}

// ============================================================
// BATCH VARIANT SKU UNIQUENESS (local, before DB insert)
// ============================================================

export function validateVariantSkuUniqueness(
  variants: Array<{ sku: string }>
): ProductValidationError[] {
  const seen = new Set<string>();
  const errors: ProductValidationError[] = [];
  for (const v of variants) {
    if (seen.has(v.sku)) {
      errors.push({
        field: 'sku',
        message: `Duplicate SKU "${v.sku}" in variant list.`,
        code: 'VARIANT_DUPLICATE_SKU',
      });
    }
    seen.add(v.sku);
  }
  return errors;
}
