/**
 * Order V2 Type Extensions — Fulfillment Phase
 *
 * Augments types from order-v2.ts without modifying the base file.
 * Import from here when you need refund with inventory restoration.
 */

import type { RefundPayload as BaseRefundPayload } from '@/types/order-v2';

/**
 * Extended RefundPayload that adds configurable inventory restoration.
 * `restoreInventory: true` triggers a 'refund' stock movement via FulfillmentService.
 */
export type RefundPayload = BaseRefundPayload & {
  restoreInventory?: boolean;
};

// Re-export all other order-v2 types unchanged
export type {
  OrderV2,
  OrderItemV2,
  OrderTimelineEntry,
  OrderShipment,
  OrderV2SearchFilters,
  OrderV2SearchResult,
  DbOrderV2Row,
  DbOrderItemV2Row,
  DbOrderTimelineRow,
  DbOrderShipmentRow,
  TimelineEvent,
  OrderV2Status,
  PaymentV2Status,
  FulfillmentStatus,
  ShipOrderPayload,
  CancelOrderPayload,
  ReturnPayload,
  ExchangePayload,
  AddTimelineNotePayload,
  UpdateOrderNotesPayload,
  GenerateDocumentPayload,
} from '@/types/order-v2';
