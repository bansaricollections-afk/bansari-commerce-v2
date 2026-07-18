/**
 * Inventory Transaction Types
 * Every movement against product_variants stock is recorded here.
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
  variantId:        string;
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

/** Raw DB row shape */
export interface DbInventoryTransactionRow {
  id:                string;
  variant_id:        string;
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

/** Payload for a manual stock adjustment from admin */
export interface ManualAdjustmentPayload {
  variantId:   string;
  quantity:    number;            // positive = add, negative = remove
  movementType: InventoryMovementType;
  reason:      string;
  actorId?:    string | null;
  actorName?:  string | null;
}
