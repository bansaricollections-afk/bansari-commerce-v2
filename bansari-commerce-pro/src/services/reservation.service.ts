/**
 * reservation.service.ts
 *
 * Manages inventory reservations during the checkout-to-payment window.
 *
 * Lifecycle:
 *   reserveStock()   — called when Razorpay order is created
 *                      decrements available_qty, increments reserved_qty
 *   releaseStock()   — called on payment failure, timeout, or cancellation
 *                      reverses the reservation
 *   confirmStock()   — called on webhook order.paid / payment.captured
 *                      decrements reserved_qty (stock is now "sold")
 *
 * All three operations are idempotent via the reservation status column.
 * The DB function reserve_inventory_stock raises an exception when
 * available_qty would go negative, so overselling is prevented at the
 * DB layer even under concurrent load.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';

export interface ReservationItem {
  product_id: number;
  variant_id: number | null;
  quantity:   number;
}

export type ReservationStatus = 'reserved' | 'confirmed' | 'released';

export interface Reservation {
  id:                string;  // UUID
  razorpay_order_id: string;
  items:             ReservationItem[];
  status:            ReservationStatus;
  expires_at:        string;
  created_at:        string;
}

export type ReservationErrorCode =
  | 'INSUFFICIENT_STOCK'
  | 'NOT_FOUND'
  | 'ALREADY_TERMINAL'
  | 'DB_ERROR';

export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code: ReservationErrorCode,
    public readonly productId?: number
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

/**
 * Reserve stock for all items in a cart.
 * Throws ReservationError with code INSUFFICIENT_STOCK if any item
 * cannot be satisfied — in that case no stock is held (the DB function
 * is transactional).
 *
 * @returns reservation ID (UUID)
 */
export async function reserveStock(
  razorpayOrderId: string,
  items:           ReservationItem[],
  ttlMinutes       = 30
): Promise<string> {
  const sb = createServiceRoleClient();

  const { data, error } = await sb.rpc('reserve_inventory_stock', {
    p_razorpay_order_id: razorpayOrderId,
    p_items:             items,
    p_ttl_minutes:       ttlMinutes,
  });

  if (error) {
    if (
      error.message.includes('insufficient') ||
      error.message.includes('out_of_stock') ||
      error.message.includes('not enough')
    ) {
      throw new ReservationError(
        'One or more items are out of stock.',
        'INSUFFICIENT_STOCK'
      );
    }
    throw new ReservationError(error.message, 'DB_ERROR');
  }

  return data as string;   // reservation UUID
}

/**
 * Release a reservation — call on payment failure, timeout, or cancellation.
 * Idempotent: calling on an already-released reservation is a no-op.
 */
export async function releaseStock(
  reservationId: string
): Promise<void> {
  const sb = createServiceRoleClient();

  const { error } = await sb.rpc('release_inventory_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    // Don't throw — release failures should be retried by a job,
    // not propagated to the webhook response (which must return 200).
    console.error('[reservation.service] releaseStock error', reservationId, error);
  }
}

/**
 * Confirm a reservation after successful payment.
 * Moves status from 'reserved' → 'confirmed', decrements reserved_qty.
 * Idempotent: safe to call twice (second call is a no-op at DB level).
 */
export async function confirmStock(
  reservationId: string
): Promise<void> {
  const sb = createServiceRoleClient();

  const { error } = await sb.rpc('confirm_inventory_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.error('[reservation.service] confirmStock error', reservationId, error);
    throw new ReservationError(error.message, 'DB_ERROR');
  }
}

/**
 * Look up the reservation ID for a Razorpay order, or return null.
 * Used by the webhook handler to obtain the reservation ID.
 */
export async function getReservationByOrder(
  razorpayOrderId: string
): Promise<Reservation | null> {
  const sb = createServiceRoleClient();

  const { data, error } = await sb
    .from('inventory_reservations')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  if (error) return null;
  return data as Reservation | null;
}

/**
 * Release all expired reservations (available_qty restoration).
 * Intended to be called by a cron / scheduled job — not in the hot path.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const sb = createServiceRoleClient();

  const { data, error } = await sb.rpc('release_expired_reservations');

  if (error) {
    console.error('[reservation.service] releaseExpiredReservations error', error);
    return 0;
  }

  return (data as number) ?? 0;
}
