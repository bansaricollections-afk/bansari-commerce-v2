/**
 * Shared commerce types — single source of truth.
 *
 * Import from this file, not from individual service files.
 * No business logic here — only types, interfaces, and constants.
 *
 * @module commerce.types
 */
import type { Money } from '../lib/money';
import type { CommerceError } from './commerce.errors';

// ---------------------------------------------------------------------------
// Result<T> — the return type of every service method
// ---------------------------------------------------------------------------

export type Result<T, E = CommerceError> =
  | { readonly success: true;  readonly data: T }
  | { readonly success: false; readonly error: E };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail<T>(error: CommerceError): Result<T> {
  return { success: false, error };
}

// ---------------------------------------------------------------------------
// Version constants — stamped on all context snapshots
// (No negotiation logic in Batch 2. Future: compatibility matrix.)
// ---------------------------------------------------------------------------

export const CheckoutVersion  = 1 as const;
export const PricingVersion   = 1 as const;
export const CouponVersion    = 1 as const;
export const InventoryVersion = 1 as const;

// ---------------------------------------------------------------------------
// Reservation identity
//
//  reservationId    — UUID, internal DB primary key (inventory_reservations.id)
//  reservationToken — opaque string, used in all external workflow references
//                     (API responses, saga compensations, webhook lookups)
//
// They are created together by InventoryReservationService.reserve().
// Consumers receive only the token; the ID is an internal persistence detail.
// ---------------------------------------------------------------------------

export type ReservationId    = string; // UUID v4
export type ReservationToken = string; // opaque — format: "rsvt_<base64url(uuid)>"

// ---------------------------------------------------------------------------
// PricingSnapshot — immutable financial record
//
// Stored as JSONB in DB. All Money fields serialised as integer paise.
// This type represents the in-memory form. The DB/JSON form uses *InPaise suffixes.
// ---------------------------------------------------------------------------

export type GstRegistrationType = 'B2B' | 'B2C' | 'EXPORT';

export type PricingSnapshot = Readonly<{
  subtotal:              Money;
  discount:              Money;
  shipping:              Money;
  tax:                   Money;
  grandTotal:            Money;

  couponId:              string | null;   // DB reference — NOT the raw code
  currency:              'INR';
  country:               string;          // ISO 3166-1 alpha-2, e.g. 'IN'
  timezone:              string;          // IANA tz, e.g. 'Asia/Kolkata'
  gstRegistrationType:   GstRegistrationType;

  pricingEngineVersion:  typeof PricingVersion;
  pricingRuleIds:        readonly string[];
  snapshotAt:            string;          // ISO 8601
}>;

/**
 * DB/JSON serialised form of PricingSnapshot.
 * All Money values are stored as integer paise.
 * Reconstruct with PricingSnapshotCodec.fromDb(row.pricing_snapshot).
 */
export type PricingSnapshotDb = {
  subtotalInPaise:    number;
  discountInPaise:    number;
  shippingInPaise:    number;
  taxInPaise:         number;
  grandTotalInPaise:  number;
  couponId:           string | null;
  currency:           'INR';
  country:            string;
  timezone:           string;
  gstRegistrationType: GstRegistrationType;
  pricingEngineVersion: number;
  pricingRuleIds:     string[];
  snapshotAt:         string;
};

// ---------------------------------------------------------------------------
// SafeLogContext — structured log fields
//
// PROHIBITED fields (must NEVER appear in any log):
//   email, phone, address, paymentSignature, pan, couponCode
// ---------------------------------------------------------------------------

export type SafeLogContext = {
  // Required identifiers
  service:           string;   // owning service name
  tenant:            string;   // 'bansari' today; multi-tenant ready
  traceId:           string;
  correlationId:     string;
  requestId:         string;
  checkoutId:        string;
  // Optional identifiers
  sessionId?:        string;
  customerId?:       string;
  reservationToken?: ReservationToken;
  razorpayOrderId?:  string;
  orderId?:          string;
  // Execution metadata
  step?:             string;
  executionTimeMs?:  number;
  result?:           'success' | 'failure' | 'skipped';
  // Structured error context (safe fields only)
  errorCode?:        string;
  errorDetail?:      Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Cart types (used by CartValidationService + CheckoutService)
// ---------------------------------------------------------------------------

export type CartItem = {
  readonly productId:   string;
  readonly variantId:   string | null;
  readonly quantity:    number;
  readonly unitPrice:   Money;  // price at time of cart add — re-validated at checkout
};

export type ValidatedCart = {
  readonly items:          readonly CartItem[];
  readonly idempotencyKey: string;  // deterministic hash of sessionId + items + catalogVersion
  readonly validatedAt:    string;  // ISO 8601
};

// ---------------------------------------------------------------------------
// Checkout types
// ---------------------------------------------------------------------------

export type CheckoutContext = Readonly<{
  version:          typeof CheckoutVersion;
  checkoutId:       string;
  correlationId:    string;
  sessionId:        string;
  customerId:       string | null;
  cart:             ValidatedCart;
  snapshot:         PricingSnapshot;
  reservationToken: ReservationToken | null;
  razorpayOrderId:  string | null;
  couponId:         string | null;
  idempotencyKey:   string;
  createdAt:        string;   // ISO 8601 — from Clock
  expiresAt:        string;   // ISO 8601 — from Clock + TTL
}>;

export type CheckoutResult = Readonly<{
  checkoutId:       string;
  reservationToken: ReservationToken;
  razorpayOrderId:  string;
  amountInPaise:    number;   // grandTotal.toPaise() — for Razorpay SDK initialisation
  currency:         'INR';
  snapshot:         PricingSnapshotDb;
  expiresAt:        string;
}>;

// ---------------------------------------------------------------------------
// Coupon types
// ---------------------------------------------------------------------------

export type CouponPreviewResult = Readonly<{
  estimatedDiscountInPaise: number;
  applicableAmount:         number;  // subtotal after any floor constraints
}>;

export type CouponValidationResult = Readonly<{
  couponId:       string;
  discountInPaise: number;
  description:    string;   // e.g. "15% off orders above ₹2,000"
}>;

export type CouponConsumeResult = Readonly<{
  couponId:   string;
  consumedAt: string;
}>;

// ---------------------------------------------------------------------------
// Inventory types
// ---------------------------------------------------------------------------

export type ReserveItem = {
  readonly productId: string;
  readonly quantity:  number;
};

export type ReservationResult = Readonly<{
  reservationId:    ReservationId;    // internal DB UUID — do not expose
  reservationToken: ReservationToken; // external workflow identifier
  expiresAt:        string;           // ISO 8601
  items:            readonly ReserveItem[];
}>;

// ---------------------------------------------------------------------------
// Payment gateway types
// ---------------------------------------------------------------------------

export type GatewayOrder = Readonly<{
  razorpayOrderId: string;
  amountInPaise:   number;
  currency:        'INR';
  receipt:         string;
  status:          'created' | 'attempted' | 'paid';
}>;

export type GatewayPayment = Readonly<{
  razorpayPaymentId: string;
  razorpayOrderId:   string;
  amountInPaise:     number;
  currency:          'INR';
  status:            'authorized' | 'captured' | 'failed' | 'refunded';
  method:            string;
  capturedAt:        string | null;
}>;

export type GatewayError = Readonly<{
  code:    string;
  message: string;
  cause?:  unknown;
}>;

export type GatewayHealthStatus = 'healthy' | 'degraded' | 'down';

// ---------------------------------------------------------------------------
// Checkout event types (for checkout_events table)
// ---------------------------------------------------------------------------

export type CheckoutEventType =
  | 'checkout_started'
  | 'checkout_prepared'
  | 'coupon_applied'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'coupon_limit_reached'
  | 'inventory_reserved'
  | 'inventory_failed'
  | 'inventory_confirmed'
  | 'reservation_released'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'checkout_recovered';
