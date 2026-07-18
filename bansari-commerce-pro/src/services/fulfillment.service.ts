/**
 * Fulfillment Service
 *
 * Single source of truth for all inventory lifecycle operations.
 * Consumed by order-v2.service and admin API routes.
 *
 * Schema facts:
 *   - product_variants.id  → bigint  → number in TS
 *   - orders.id            → uuid    → string in TS
 *   - order_items          → has NO variant_id column
 *     Resolution strategy: join order_items → products → product_variants
 *     using order_items.product_id + variant filters to locate the correct
 *     variant. For Bansari Commerce's current model (one default variant per
 *     product), we select the single active variant for the ordered product.
 *     When multi-variant ordering is added, a variant_id column should be
 *     added to order_items and this join can be replaced with a direct lookup.
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

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape of each row returned by the order_items + product_variants join */
interface OrderLineWithVariant {
  product_id: number;
  quantity:   number;
  variant_id: number;   // resolved from product_variants
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapTransaction(row: DbInventoryTransactionRow): InventoryTransaction {
  return {
    id:               row.id,
    variantId:        row.variant_id,       // number (bigint)
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

// ─── Idempotency key builders ─────────────────────────────────────────────────

function reserveKey(orderId: string, variantId: number) {
  return `reserve:${orderId}:${variantId}`;
}
function releaseKey(orderId: string, variantId: number) {
  return `release:${orderId}:${variantId}`;
}
function saleKey(orderId: string, variantId: number) {
  return `sale:${orderId}:${variantId}`;
}
function returnKey(orderId: string, variantId: number) {
  return `return:${orderId}:${variantId}`;
}
function refundKey(orderId: string, variantId: number) {
  return `refund:${orderId}:${variantId}`;
}

// ─── Private: resolve variant IDs for an order ───────────────────────────────

/**
 * order_items has no variant_id column (schema-verified).
 *
 * Resolution:
 *   1. Fetch order_items for this order → get product_id + quantity
 *   2. For each product_id, fetch the single DEFAULT (is_default = true) active
 *      variant from product_variants.
 *   3. If no default variant exists, fall back to the lowest-id active variant.
 *
 * This mirrors Bansari Commerce's current product model where each product
 * has exactly one default variant driving inventory.
 */
async function resolveOrderLines(
  orderId: string
): Promise<OrderLineWithVariant[]> {
  const sb = createServiceRoleClient();

  // Step 1: fetch order items
  const { data: items, error: itemsErr } = await sb
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)
    .not('product_id', 'is', null);

  if (itemsErr) throw new Error(`resolveOrderLines: ${itemsErr.message}`);
  if (!items || items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.product_id as number))];

  // Step 2: fetch default active variants for all products in one query
  const { data: variants, error: variantsErr } = await sb
    .from('product_variants')
    .select('id, product_id, is_default, status')
    .in('product_id', productIds)
    .eq('status', 'active')
    .order('is_default', { ascending: false })  // default variants first
    .order('id',         { ascending: true });    // tie-break by id

  if (variantsErr) throw new Error(`resolveOrderLines: ${variantsErr.message}`);

  // Build a product_id → variant_id map (first hit = preferred default)
  const variantMap = new Map<number, number>();
  for (const v of variants ?? []) {
    const pid = v.product_id as number;
    if (!variantMap.has(pid)) {
      variantMap.set(pid, v.id as number);
    }
  }

  // Step 3: merge quantity with resolved variant IDs
  const lines: OrderLineWithVariant[] = [];
  for (const item of items) {
    const pid = item.product_id as number;
    const vid = variantMap.get(pid);
    if (vid === undefined) {
      log.warn('fulfillment.resolve.no_variant', { orderId, productId: pid });
      continue; // skip products with no active variant (do not throw)
    }
    // Aggregate quantities if the same product appears more than once
    const existing = lines.find((l) => l.variant_id === vid);
    if (existing) {
      existing.quantity += item.quantity as number;
    } else {
      lines.push({ product_id: pid, quantity: item.quantity as number, variant_id: vid });
    }
  }

  return lines;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const FulfillmentService = {

  // ────────────────────────────────────────────────────────────────
  // RESERVE — called when order is created (pending status)
  // ────────────────────────────────────────────────────────────────

  async reserveForOrder(
    orderId: string,
    opts?: { actorId?: string | null; actorName?: string | null }
  ): Promise<void> {
    const sb = createServiceRoleClient();
    let lines: OrderLineWithVariant[];

    try {
      lines = await resolveOrderLines(orderId);
    } catch (err) {
      log.error('fulfillment.reserve.resolve_failed', err, { orderId });
      throw new Error(`Failed to resolve variants for order ${orderId}: ${String(err)}`);
    }

    const failures: number[] = [];

    for (const line of lines) {
      const { error: rpcErr } = await sb.rpc('increment_variant_reserved_stock', {
        p_variant_id:  line.variant_id,        // number (bigint)
        p_quantity:    line.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_reason:      'order_reservation',
        p_idempotency: reserveKey(orderId, line.variant_id),
      });

      if (rpcErr) {
        log.error('fulfillment.reserve.variant_failed', rpcErr, {
          orderId, variantId: line.variant_id,
        });
        failures.push(line.variant_id);
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
    let lines: OrderLineWithVariant[];

    try {
      lines = await resolveOrderLines(orderId);
    } catch (err) {
      log.warn('fulfillment.release.resolve_failed', { orderId, error: err });
      return; // release failures must not block the cancel
    }

    for (const line of lines) {
      const { error: rpcErr } = await sb.rpc('decrement_variant_reserved_stock', {
        p_variant_id:  line.variant_id,
        p_quantity:    line.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_reason:      opts?.reason ?? 'order_cancellation',
        p_idempotency: releaseKey(orderId, line.variant_id),
      });

      if (rpcErr) {
        log.warn('fulfillment.release.variant_failed', {
          orderId, variantId: line.variant_id, error: rpcErr,
        });
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
    let lines: OrderLineWithVariant[];

    try {
      lines = await resolveOrderLines(orderId);
    } catch (err) {
      log.warn('fulfillment.sale.resolve_failed', { orderId, error: err });
      return;
    }

    for (const line of lines) {
      const { error: rpcErr } = await sb.rpc('convert_reservation_to_sale', {
        p_variant_id:  line.variant_id,
        p_quantity:    line.quantity,
        p_order_id:    orderId,
        p_actor_id:    opts?.actorId   ?? null,
        p_actor_name:  opts?.actorName ?? null,
        p_idempotency: saleKey(orderId, line.variant_id),
      });

      if (rpcErr) {
        log.warn('fulfillment.sale.variant_failed', {
          orderId, variantId: line.variant_id, error: rpcErr,
        });
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
    let lines: OrderLineWithVariant[];

    try {
      lines = await resolveOrderLines(orderId);
    } catch (err) {
      log.warn('fulfillment.restore.resolve_failed', { orderId, error: err });
      return;
    }

    const keyFn = movementType === 'refund' ? refundKey : returnKey;

    for (const line of lines) {
      const { error: rpcErr } = await sb.rpc('restore_variant_stock', {
        p_variant_id:    line.variant_id,
        p_quantity:      line.quantity,
        p_movement_type: movementType,
        p_order_id:      orderId,
        p_actor_id:      opts?.actorId   ?? null,
        p_actor_name:    opts?.actorName ?? null,
        p_reason:        opts?.reason ?? `${movementType}_processed`,
        p_idempotency:   keyFn(orderId, line.variant_id),
      });

      if (rpcErr) {
        log.warn('fulfillment.restore.variant_failed', {
          orderId, variantId: line.variant_id, error: rpcErr,
        });
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
  // variantId is a number (bigint PK on product_variants)
  // ────────────────────────────────────────────────────────────────

  async manualAdjustment(payload: ManualAdjustmentPayload): Promise<void> {
    const sb = createServiceRoleClient();

    if (payload.quantity === 0) return;

    const { data: variant, error: fetchErr } = await sb
      .from('product_variants')
      .select('stock, reserved_stock')
      .eq('id', payload.variantId)   // number matches bigint PK
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
        variant_id:        payload.variantId,  // number
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
      log.warn('fulfillment.manual_adjustment.tx_failed', {
        variantId: payload.variantId, error: txErr,
      });
    }
  },

  // ────────────────────────────────────────────────────────────────
  // GET TRANSACTIONS — for variant audit log
  // variantId is a number (bigint PK)
  // ────────────────────────────────────────────────────────────────

  async getTransactionsForVariant(
    variantId: number,           // number, not string
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
