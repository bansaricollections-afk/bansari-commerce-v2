/**
 * Order V2 — Typed Errors
 * Mirrors ProductError pattern from product-errors.ts
 */

export type OrderErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'ALREADY_CANCELLED'
  | 'ALREADY_DELIVERED'
  | 'ALREADY_REFUNDED'
  | 'RETURN_NOT_ALLOWED'
  | 'EXCHANGE_NOT_ALLOWED'
  | 'INVALID_REFUND_AMOUNT'
  | 'COURIER_REQUIRED'
  | 'AWB_REQUIRED'
  | 'VALIDATION'
  | 'INTERNAL';

export class OrderError extends Error {
  readonly code: OrderErrorCode;

  constructor(message: string, code: OrderErrorCode) {
    super(message);
    this.name = 'OrderError';
    this.code = code;
  }
}

/** Status transition allowlist */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:              ['confirmed', 'cancelled'],
  confirmed:            ['processing', 'cancelled'],
  processing:           ['packed', 'cancelled'],
  packed:               ['shipped', 'cancelled'],
  shipped:              ['out_for_delivery', 'delivered', 'return_requested'],
  out_for_delivery:     ['delivered', 'return_requested'],
  delivered:            ['return_requested', 'exchange_requested'],
  cancelled:            [],
  return_requested:     ['return_picked', 'cancelled'],
  return_picked:        ['return_received'],
  return_received:      ['returned', 'exchange_processing'],
  returned:             ['refund_requested'],
  refund_requested:     ['refund_processing'],
  refund_processing:    ['refunded', 'partially_refunded'],
  refunded:             [],
  partially_refunded:   ['refund_requested'],
  exchange_requested:   ['exchange_processing', 'cancelled'],
  exchange_processing:  ['exchange_shipped'],
  exchange_shipped:     ['exchanged'],
  exchanged:            [],
};

export function assertValidTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new OrderError(
      `Invalid status transition: ${from} → ${to}. Allowed: [${allowed.join(', ')}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}
