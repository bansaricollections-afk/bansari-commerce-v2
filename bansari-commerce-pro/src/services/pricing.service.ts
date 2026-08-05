/**
 * PricingService — single source of truth for all price calculations.
 *
 * RULES:
 *  1. PURE — zero I/O, zero side effects, no async.
 *     It takes inputs and returns a PricingSnapshot.
 *  2. All arithmetic uses Money value object — no raw number math.
 *  3. This service is the ONLY place in the codebase that calculates totals.
 *     Cart, PDP, Checkout, Admin, and future APIs all call this.
 *  4. A snapshot produced here is FROZEN and stored verbatim in the DB.
 *     Totals are NEVER recalculated from a stored order — the snapshot is the record.
 *
 * @module pricing.service
 */
import { Money } from '../lib/money';
import type { Clock } from '../lib/clock';
import { systemClock } from '../lib/clock';
import {
  PricingVersion,
  type PricingSnapshot,
  type PricingSnapshotDb,
  type CartItem,
  type GstRegistrationType,
} from '../types/commerce.types';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export type PricingInput = {
  readonly items:                readonly CartItem[];
  /** Discount from coupon, already validated — pass Money.zero() if none. */
  readonly couponDiscount:       Money;
  /** DB id of the applied coupon, or null. */
  readonly couponId:             string | null;
  readonly country:              string;           // 'IN'
  readonly timezone:             string;           // 'Asia/Kolkata'
  readonly gstRegistrationType:  GstRegistrationType;
  /** IDs of any active pricing rules applied (for audit). */
  readonly appliedRuleIds?:      readonly string[];
};

// ---------------------------------------------------------------------------
// Shipping rule (encapsulated — only PricingService reads this)
// ---------------------------------------------------------------------------

const FREE_SHIPPING_THRESHOLD_PAISE = 49900; // ₹499
const FLAT_SHIPPING_PAISE           = 4900;  // ₹49

function computeShipping(subtotal: Money): Money {
  if (subtotal.toPaise() >= FREE_SHIPPING_THRESHOLD_PAISE) {
    return Money.zero();
  }
  return Money.of(FLAT_SHIPPING_PAISE);
}

// ---------------------------------------------------------------------------
// Tax rule (GST-ready — currently 0% for B2C, configurable for B2B)
// Tax is applied on (subtotal - discount + shipping) per Indian GST norms.
// Extend this function when GST rates are configured per category.
// ---------------------------------------------------------------------------

function computeTax(
  subtotalAfterDiscount: Money,
  shipping: Money,
  gstType: GstRegistrationType
): Money {
  // Phase 1: tax = 0 for all registration types.
  // Phase 2 (future): apply per-category GST rate from product HSN codes.
  void subtotalAfterDiscount;
  void shipping;
  void gstType;
  return Money.zero();
}

// ---------------------------------------------------------------------------
// PricingService
// ---------------------------------------------------------------------------

export class PricingService {
  constructor(private readonly _clock: Clock = systemClock) {}

  /**
   * Calculate a complete, frozen PricingSnapshot.
   *
   * The result should be stored verbatim as pricing_snapshot JSONB.
   * Never modify a snapshot after creation.
   */
  calculate(input: PricingInput): PricingSnapshot {
    // 1. Subtotal = sum of (unitPrice × quantity) for each item.
    const subtotal = input.items.reduce(
      (acc, item) => acc.add(item.unitPrice.multiply(item.quantity)),
      Money.zero()
    );

    // 2. Discount — already validated and computed by CouponService.
    //    PricingService does not re-validate the coupon.
    //    If no coupon: pass Money.zero().
    const discount = input.couponDiscount;

    // 3. Shipping — applied on subtotal before discount (per Bansari policy).
    const shipping = computeShipping(subtotal);

    // 4. Tax — on (subtotal - discount + shipping).
    const taxableAmount = subtotal.subtract(discount).add(shipping);
    const tax = computeTax(taxableAmount, shipping, input.gstRegistrationType);

    // 5. Grand total.
    const grandTotal = subtotal.subtract(discount).add(shipping).add(tax);

    const snapshot: PricingSnapshot = Object.freeze({
      subtotal,
      discount,
      shipping,
      tax,
      grandTotal,
      couponId:             input.couponId,
      currency:             'INR',
      country:              input.country,
      timezone:             input.timezone,
      gstRegistrationType:  input.gstRegistrationType,
      pricingEngineVersion: PricingVersion,
      pricingRuleIds:       Object.freeze([...(input.appliedRuleIds ?? [])]),
      snapshotAt:           this._clock.now().toISOString(),
    });

    return snapshot;
  }

  // ---------------------------------------------------------------------------
  // Codec — serialise to DB form and restore from DB form
  // ---------------------------------------------------------------------------

  /**
   * Serialise a PricingSnapshot for storage in JSONB column.
   * All Money values → integer paise.
   */
  static toDb(snapshot: PricingSnapshot): PricingSnapshotDb {
    return {
      subtotalInPaise:      snapshot.subtotal.toPaise(),
      discountInPaise:      snapshot.discount.toPaise(),
      shippingInPaise:      snapshot.shipping.toPaise(),
      taxInPaise:           snapshot.tax.toPaise(),
      grandTotalInPaise:    snapshot.grandTotal.toPaise(),
      couponId:             snapshot.couponId,
      currency:             snapshot.currency,
      country:              snapshot.country,
      timezone:             snapshot.timezone,
      gstRegistrationType:  snapshot.gstRegistrationType,
      pricingEngineVersion: snapshot.pricingEngineVersion,
      pricingRuleIds:       [...snapshot.pricingRuleIds],
      snapshotAt:           snapshot.snapshotAt,
    };
  }

  /**
   * Restore a PricingSnapshot from a DB row's JSONB field.
   * Reconstructs Money objects from stored integer paise values.
   */
  static fromDb(row: PricingSnapshotDb): PricingSnapshot {
    return Object.freeze({
      subtotal:             Money.of(row.subtotalInPaise),
      discount:             Money.of(row.discountInPaise),
      shipping:             Money.of(row.shippingInPaise),
      tax:                  Money.of(row.taxInPaise),
      grandTotal:           Money.of(row.grandTotalInPaise),
      couponId:             row.couponId,
      currency:             row.currency,
      country:              row.country,
      timezone:             row.timezone,
      gstRegistrationType:  row.gstRegistrationType,
      pricingEngineVersion: row.pricingEngineVersion as typeof PricingVersion,
      pricingRuleIds:       Object.freeze([...row.pricingRuleIds]),
      snapshotAt:           row.snapshotAt,
    });
  }
}
