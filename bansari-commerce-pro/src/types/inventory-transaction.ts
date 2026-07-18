/**
 * Inventory Transaction Types
 *
 * Schema facts (source of truth: migrations):
 *   - inventory_transactions.variant_id → bigint (PostgreSQL) → number (TypeScript)
 *   - inventory_transactions.order_id   → uuid   → string
 *   - product_variants.id               → bigint → number
 *   - order_items has NO variant_id column; variant is resolved via product_id
 */

export type InventoryMovementType =
  | 'reservation'
  | 'release'
  | 'sale'
  | 'return'
  | 'refund'
  | 'manual_adjustment'
  | 'damage'
  | 'lost'
  | 'capture';

export interface InventoryTransaction {
  id:               string;
  variantId:        number;          // bigint in DB — always a number in TS
  orderId:          string | null;
  movementType:     InventoryMovementType;
  quantity:         number;
  previousStock:    number;
  newStock:         number;
  previousReserved: number;
  newReserved:      number;
  actorId:          string | null;
  actorName:        string | null;
  reason:           string | null;
  idempotencyKey:   string | null;
  createdAt:        string;
}

/** Raw DB row shape — variant_id comes back as number from Supabase JS client */
export interface DbInventoryTransactionRow {
  id:                string;
  variant_id:        number;         // bigint → number
  order_id:          string | null;
  movement_type:     InventoryMovementType;
  quantity:          number;
  previous_stock:    number;
  new_stock:         number;
  previous_reserved: number;
  new_reserved:      number;
  actor_id:          string | null;
  actor_name:        string | null;
  reason:            string | null;
  idempotency_key:   string | null;
  created_at:        string;
}

export interface FulfillmentMetrics {
  reservedStockTotal:   number;
  availableStockTotal:  number;
  lowStockVariants:     number;
  outOfStockVariants:   number;
  pendingShipments:     number;
  returnsAwaiting:      number;
}

/**
 * Payload for a manual stock adjustment from admin.
 * variantId is a number (bigint PK on product_variants).
 */
export interface ManualAdjustmentPayload {
  variantId:    number;              // bigint PK
  quantity:     number;              // positive = add, negative = remove
  movementType: InventoryMovementType;
  reason:       string;
  actorId?:     string | null;
  actorName?:   string | null;
}
