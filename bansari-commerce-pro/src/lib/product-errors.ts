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
