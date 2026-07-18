/**
 * Fulfillment Service
 *
 * Single source of truth for all inventory lifecycle operations.
 * Consumed by order-v2.service and admin API routes.
 *
 * Rules:
 *   - Every mutation goes through a Supabase RPC (DB-level transaction + row lock)
 *   - Idempotency keys prevent duplicate inventory movements
 *   - No business logic in API routes or React components
 *   - Reuses createServiceRoleClient from existing lib
 */

import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import type {
  InventoryTransaction,
  DbInventoryTransactionRow,
  FulfillmentMetrics,
  ManualAdjustmentPayload,
  InventoryMovementType,
} from '@/types/inventory-transaction';

const log = createLogger({ service: 'fulfillment.service' });

// ─── Mapper ─────────────────────────────────────────────────────────────────

function mapTransaction(row: DbInventoryTransactionRow): InventoryTransaction {
  return {
    id:               row.id,
    variantId:        row.variant_id,
    orderId:          row.order_id,
    movementType:     row.movement_type,
    quantity:         row.quantity,
    previousStock:    row.previous_stock,
    newStock:         row.new_stock,
    previousReserved: row.previous_reserved,
    newReserved:      row.new_reserved,
    actorId:          row.actor_id,
    actorName:        row.actor_name,
    reason:           row.reason,
    idempotencyKey:   row.idempotency_key,
    createdAt:        row.created_at,
  };
}

// ─── Idempotency key builders ────────────────────────────────────────────────

function reserveKey(orderId: string, variantId: string) {
  return `reserve:${orderId}:${variantId}`;
}
function releaseKey(orderId: string, variantId: string) {
  return `release:${orderId}:${variantId}`;
}
function saleKey(orderId: string, variantId: string) {
  return `sale:${orderId}:${variantId}`;
}
function returnKey(orderId: string, variantId: string) {
  return `return:${orderId}:${variantId}`;
}
function refundKey(orderId: string, variantId: string) {
  return `refund:${orderId}:${variantId}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const FulfillmentService = {

  // ────────────────────────────────────────────────────────────────
  // RESERVE — called when order is created (pending status)
  // ────────────────────────────────────────────────────────────────

  async reserveForOrder(
    orderId: string,
    opts?: { actorId?: string | null; actorName?: string | null }
  ): Promise<void> {
    const sb = createServiceRoleClient();

    const { data: items, error } = await sb
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId)
      .not('variant_id', 'is', null);

    if (error) {
      log.error('fulfillment.reserve.fetch_failed', error, { orderId });
      throw new Error(`Failed to fetch order items for reservation: ${error.message}`);
    }

    const failures: string[] = [];

    for (const item of items ?? []) {
      if (!item.variant_id) continue;

      const { error: rpcErr } = await sb.rpc('increment_variant_reserved_stock', {
        p_variant_id:  item.variant_id,
        p_quantity:    item.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_reason:      'order_reservation',
        p_idempotency: reserveKey(orderId, item.variant_id as string),
      });

      if (rpcErr) {
        log.error('fulfillment.reserve.variant_failed', rpcErr, {
          orderId, variantId: item.variant_id,
        });
        failures.push(item.variant_id as string);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Insufficient stock for ${failures.length} variant(s): ${failures.join(', ')}`
      );
    }
  },

  // ────────────────────────────────────────────────────────────────
  // RELEASE — called on cancellation
  // ────────────────────────────────────────────────────────────────

  async releaseForOrder(
    orderId: string,
    opts?: { actorId?: string | null; actorName?: string | null; reason?: string }
  ): Promise<void> {
    const sb = createServiceRoleClient();

    const { data: items, error } = await sb
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId)
      .not('variant_id', 'is', null);

    if (error) {
      log.error('fulfillment.release.fetch_failed', error, { orderId });
      return; // release failures must not block the cancel
    }

    for (const item of items ?? []) {
      if (!item.variant_id) continue;

      const { error: rpcErr } = await sb.rpc('decrement_variant_reserved_stock', {
        p_variant_id:  item.variant_id,
        p_quantity:    item.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_reason:      opts?.reason ?? 'order_cancellation',
        p_idempotency: releaseKey(orderId, item.variant_id as string),
      });

      if (rpcErr) {
        log.warn('fulfillment.release.variant_failed', { orderId, variantId: item.variant_id, error: rpcErr });
      }
    }
  },

  // ────────────────────────────────────────────────────────────────
  // FINALISE SALE — called on delivery
  // Converts reservation into a permanent stock deduction.
  // ────────────────────────────────────────────────────────────────

  async finaliseSaleForOrder(
    orderId: string,
    opts?: { actorId?: string | null; actorName?: string | null }
  ): Promise<void> {
    const sb = createServiceRoleClient();

    const { data: items, error } = await sb
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId)
      .not('variant_id', 'is', null);

    if (error) {
      log.error('fulfillment.sale.fetch_failed', error, { orderId });
      return;
    }

    for (const item of items ?? []) {
      if (!item.variant_id) continue;

      const { error: rpcErr } = await sb.rpc('convert_reservation_to_sale', {
        p_variant_id:  item.variant_id,
        p_quantity:    item.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_idempotency: saleKey(orderId, item.variant_id as string),
      });

      if (rpcErr) {
        log.warn('fulfillment.sale.variant_failed', { orderId, variantId: item.variant_id, error: rpcErr });
      }
    }
  },

  // ────────────────────────────────────────────────────────────────
  // RESTORE STOCK — called on return (item physically back in warehouse)
  // ────────────────────────────────────────────────────────────────

  async restoreStockForOrder(
    orderId: string,
    movementType: Extract<InventoryMovementType, 'return' | 'refund'> = 'return',
    opts?: { actorId?: string | null; actorName?: string | null; reason?: string }
  ): Promise<void> {
    const sb = createServiceRoleClient();

    const { data: items, error } = await sb
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId)
      .not('variant_id', 'is', null);

    if (error) {
      log.error('fulfillment.restore.fetch_failed', error, { orderId });
      return;
    }

    const keyFn = movementType === 'refund' ? refundKey : returnKey;

    for (const item of items ?? []) {
      if (!item.variant_id) continue;

      const { error: rpcErr } = await sb.rpc('restore_variant_stock', {
        p_variant_id:   item.variant_id,
        p_quantity:     item.quantity,
        p_movement_type: movementType,
        p_order_id:     orderId,
        p_actor_id:     opts?.actorId   ?? null,
        p_actor_name:   opts?.actorName ?? null,
        p_reason:       opts?.reason ?? `${movementType}_processed`,
        p_idempotency:  keyFn(orderId, item.variant_id as string),
      });

      if (rpcErr) {
        log.warn('fulfillment.restore.variant_failed', { orderId, variantId: item.variant_id, error: rpcErr });
      }
    }
  },

  // ────────────────────────────────────────────────────────────────
  // METRICS — for admin dashboard
  // ────────────────────────────────────────────────────────────────

  async getMetrics(): Promise<FulfillmentMetrics> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb.rpc('get_fulfillment_metrics');
    if (error) throw new Error(`Failed to fetch fulfillment metrics: ${error.message}`);

    const row = Array.isArray(data) ? data[0] : data;
    return {
      reservedStockTotal:  Number(row?.reserved_stock_total  ?? 0),
      availableStockTotal: Number(row?.available_stock_total ?? 0),
      lowStockVariants:    Number(row?.low_stock_variants    ?? 0),
      outOfStockVariants:  Number(row?.out_of_stock_variants ?? 0),
      pendingShipments:    Number(row?.pending_shipments     ?? 0),
      returnsAwaiting:     Number(row?.returns_awaiting      ?? 0),
    };
  },

  // ────────────────────────────────────────────────────────────────
  // MANUAL ADJUSTMENT — admin-initiated stock correction
  // ────────────────────────────────────────────────────────────────

  async manualAdjustment(payload: ManualAdjustmentPayload): Promise<void> {
    const sb = createServiceRoleClient();

    if (payload.quantity === 0) return;

    // Read current state
    const { data: variant, error: fetchErr } = await sb
      .from('product_variants')
      .select('stock, reserved_stock')
      .eq('id', payload.variantId)
      .single();

    if (fetchErr || !variant) {
      throw new Error(`Variant ${payload.variantId} not found`);
    }

    const prevStock    = variant.stock as number;
    const prevReserved = variant.reserved_stock as number;
    const newStock     = Math.max(0, prevStock + payload.quantity);

    const { error: updateErr } = await sb
      .from('product_variants')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', payload.variantId);

    if (updateErr) throw new Error(updateErr.message);

    const { error: txErr } = await sb
      .from('inventory_transactions')
      .insert({
        variant_id:        payload.variantId,
        order_id:          null,
        movement_type:     payload.movementType,
        quantity:          Math.abs(payload.quantity),
        previous_stock:    prevStock,
        new_stock:         newStock,
        previous_reserved: prevReserved,
        new_reserved:      prevReserved,
        actor_id:          payload.actorId   ?? null,
        actor_name:        payload.actorName ?? null,
        reason:            payload.reason,
        idempotency_key:   null,
      });

    if (txErr) {
      log.warn('fulfillment.manual_adjustment.tx_failed', { variantId: payload.variantId, error: txErr });
    }
  },

  // ────────────────────────────────────────────────────────────────
  // GET TRANSACTIONS — for variant audit log
  // ────────────────────────────────────────────────────────────────

  async getTransactionsForVariant(
    variantId: string,
    limit = 50
  ): Promise<InventoryTransaction[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('inventory_transactions')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as DbInventoryTransactionRow[]).map(mapTransaction);
  },

  async getTransactionsForOrder(
    orderId: string
  ): Promise<InventoryTransaction[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('inventory_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as DbInventoryTransactionRow[]).map(mapTransaction);
  },
};
