export interface Inventory {
  id: number;

  productId: number;

  sku: string;

  size: string;

  colour: string;

  stock: number;

  reserved: number;

  lowStockThreshold: number;

  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint-4 inventory domain types — canonical definitions live in
// inventory.service.ts; re-exported here so that all component imports that
// use `@/types/inventory` are satisfied without duplicating any definitions.
// ─────────────────────────────────────────────────────────────────────────────
export type {
  AdjustmentReason,
  PoStatus,
  TransferStatus,
  StockStatus,
  Warehouse,
  Vendor,
  InventorySummaryRow,
  PurchaseOrderItem,
  PurchaseOrder,
  StockTransfer,
  AdjustStockPayload,
  TransferStockPayload,
  CreatePoItemPayload,
  CreatePoPayload,
  PoReceiptLine,
  ReceivePoPayload,
  InventorySearchFilters,
  InventorySearchResult,
  InventoryErrorCode,
} from '@/services/inventory.service';

export { InventoryError } from '@/services/inventory.service';
