/**
 * shipping.ts
 * -----------
 * Single source of truth for all shipping cost calculations.
 *
 * Pure TypeScript — no React, no browser APIs, no JSX, no side effects.
 * Safe to import from RSC, client components, API routes, and tests.
 */

/** Minimum cart subtotal (₹) required to qualify for free shipping. */
export const SHIPPING_THRESHOLD = 2999;

/** Flat-rate shipping cost (₹) applied when subtotal < SHIPPING_THRESHOLD. */
export const STANDARD_SHIPPING = 99;

/**
 * Returns the shipping cost for a given cart subtotal.
 * ₹0 when subtotal >= SHIPPING_THRESHOLD, otherwise STANDARD_SHIPPING.
 */
export function getShippingCost(subtotal: number): number {
  return subtotal >= SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

/**
 * Returns true when the subtotal qualifies for free shipping.
 */
export function isFreeShipping(subtotal: number): boolean {
  return subtotal >= SHIPPING_THRESHOLD;
}

/**
 * Returns the amount still needed to unlock free shipping.
 * Returns 0 when free shipping is already active.
 */
export function getRemainingForFreeShipping(subtotal: number): number {
  return Math.max(0, SHIPPING_THRESHOLD - subtotal);
}

/**
 * Returns a human-readable shipping status message suitable for UI display.
 */
export function getShippingMessage(subtotal: number): string {
  if (isFreeShipping(subtotal)) {
    return 'You qualify for free shipping!';
  }
  const remaining = getRemainingForFreeShipping(subtotal);
  return `Add \u20b9${remaining.toLocaleString('en-IN')} more for free shipping`;
}
