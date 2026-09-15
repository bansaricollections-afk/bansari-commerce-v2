/**
 * Product Management 2.0 — Typed Error Class
 * Provides actionable, typed errors instead of generic Error.
 */
import type { ProductErrorCode } from '@/types/product-v2';

export class ProductError extends Error {
  readonly code: ProductErrorCode;
  readonly field: string | null;
  readonly statusHint: number;

  constructor(
    message: string,
    code: ProductErrorCode,
    options?: { field?: string; statusHint?: number }
  ) {
    super(message);
    this.name = 'ProductError';
    this.code = code;
    this.field = options?.field ?? null;
    this.statusHint = options?.statusHint ?? 400;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      field: this.field,
    };
  }
}

export function isProductError(err: unknown): err is ProductError {
  return err instanceof ProductError;
}

/**
 * HTTP status for a ProductError code.
 *
 * WHY THIS EXISTS
 * Both product routes used to carry their own hand-written lookup:
 *
 *   const statusMap = { VALIDATION: 422, SIZE_INVENTORY_REQUIRED: 422, ... };
 *   return apiError(requestId, code, message, statusMap[code] ?? 500);
 *
 * Neither map listed the codes validation actually throws — NAME_REQUIRED,
 * CATEGORY_REQUIRED, PRICE_INVALID, MRP_BELOW_SELLING, IMAGE_DUPLICATE_URL and
 * the rest. There is no 'VALIDATION' code anywhere in the codebase. So every
 * ordinary mistake in the Add Product form fell through `?? 500` and was
 * reported as a server error, which sent people looking for a crash that never
 * happened.
 *
 * Inverted here on purpose: a ProductError is something we chose to throw
 * about the caller's input, so the default is 400. Only a genuine failure
 * underneath — INTERNAL, which is what a Postgres error is wrapped in — is a
 * 500. A validation code added later is now correctly a 4xx without anyone
 * remembering to update a list.
 */
export function productErrorStatus(code: string): number {
  switch (code) {
    case 'INTERNAL':
      return 500;
    case 'NOT_FOUND':
      return 404;
    case 'SKU_DUPLICATE':
    case 'SLUG_DUPLICATE':
    case 'DUPLICATE_SKU':
    case 'DUPLICATE_SLUG':
    case 'VARIANT_DUPLICATE_SKU':
      return 409;
    case 'SIZE_INVENTORY_REQUIRED':
      return 422;
    default:
      // Every remaining ProductError describes bad input.
      return 400;
  }
}
