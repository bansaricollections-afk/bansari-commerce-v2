/**
 * Commerce error hierarchy.
 *
 * RULES:
 *  1. Services NEVER throw CommerceError for expected domain failures.
 *     They return Result<T, CommerceError> instead.
 *  2. Throwing is reserved for truly unexpected programmer errors
 *     (e.g. invalid internal state that should never occur).
 *  3. Every error code is a namespaced string literal — no magic numbers.
 *
 * @module commerce.errors
 */

// ---------------------------------------------------------------------------
// Error codes — exhaustive union of all domain error conditions
// ---------------------------------------------------------------------------

export type CommerceErrorCode =
  // Cart
  | 'CART_EMPTY'
  | 'CART_ITEM_INVALID'
  | 'CART_ITEM_UNAVAILABLE'
  | 'CART_STALE'
  // Coupon
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_INACTIVE'
  | 'COUPON_USAGE_LIMIT_REACHED'
  | 'COUPON_MIN_ORDER_NOT_MET'
  | 'COUPON_ALREADY_CONSUMED'
  | 'COUPON_ROLLBACK_FAILED'
  // Inventory
  | 'INVENTORY_INSUFFICIENT'
  | 'INVENTORY_RESERVATION_FAILED'
  | 'INVENTORY_RESERVATION_EXPIRED'
  | 'INVENTORY_RESERVATION_NOT_FOUND'
  | 'INVENTORY_CONFIRM_FAILED'
  | 'INVENTORY_RELEASE_FAILED'
  // Pricing
  | 'PRICING_SNAPSHOT_INVALID'
  | 'PRICING_TOTAL_MISMATCH'
  // Checkout
  | 'CHECKOUT_IDEMPOTENCY_CONFLICT'
  | 'CHECKOUT_SAGA_PARTIAL_FAILURE'
  | 'CHECKOUT_ALREADY_COMPLETED'
  | 'CHECKOUT_EXPIRED'
  // Payment gateway
  | 'GATEWAY_ORDER_CREATION_FAILED'
  | 'GATEWAY_SIGNATURE_INVALID'
  | 'GATEWAY_PAYMENT_FETCH_FAILED'
  | 'GATEWAY_UNAVAILABLE'
  | 'CIRCUIT_OPEN'
  // Order
  | 'ORDER_NOT_FOUND'
  | 'ORDER_ALREADY_PAID'
  | 'ORDER_CREATION_FAILED'
  | 'PENDING_ORDER_CREATION_FAILED'
  // Webhook
  | 'WEBHOOK_DUPLICATE'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_PAYLOAD_INVALID'
  // Generic
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED';

// ---------------------------------------------------------------------------
// CommerceError — the single error type returned by all services
// ---------------------------------------------------------------------------

export interface CommerceError {
  /** Machine-readable code. Use in switch/match, never compare message strings. */
  readonly code:     CommerceErrorCode;
  /** Human-readable message — for logs and admin tooling, NOT end-user display. */
  readonly message:  string;
  /** Optional structured detail — additional context safe to log. */
  readonly detail?:  Record<string, unknown>;
  /** Original error if this wraps a lower-level exception. */
  readonly cause?:   unknown;
}

// ---------------------------------------------------------------------------
// Constructors — ensures consistent shape
// ---------------------------------------------------------------------------

export function makeError(
  code:    CommerceErrorCode,
  message: string,
  detail?: Record<string, unknown>,
  cause?:  unknown
): CommerceError {
  return Object.freeze({ code, message, detail, cause });
}

export function internalError(message: string, cause?: unknown): CommerceError {
  return makeError('INTERNAL_ERROR', message, undefined, cause);
}

export function validationError(message: string, detail?: Record<string, unknown>): CommerceError {
  return makeError('VALIDATION_ERROR', message, detail);
}

export function circuitOpenError(serviceName: string): CommerceError {
  return makeError('CIRCUIT_OPEN', `Circuit breaker is OPEN for service: ${serviceName}`);
}
