/**
 * Order Management System V2 — Domain Models
 *
 * Extends the existing orders foundation.
 * Legacy Order / OrderItem / OrderWithItems in order.service.ts are UNTOUCHED.
 *
 * These types map to columns added by migration
 * 20260718200000_order_management_v2_foundation.sql
 */

// ============================================================
// ENUMS / LITERALS
// ============================================================

export const ORDER_V2_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'return_picked',
  'return_received',
  'returned',
  'exchange_requested',
  'exchange_processing',
  'exchange_shipped',
  'exchanged',
  'refund_requested',
  'refund_processing',
  'refunded',
  'partially_refunded',
] as const;
export type OrderV2Status = (typeof ORDER_V2_STATUSES)[number];

export const PAYMENT_V2_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'partially_paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'disputed',
] as const;
export type PaymentV2Status = (typeof PAYMENT_V2_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'partial',
  'fulfilled',
  'returned',
  'cancelled',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  'pending',
  'ready_to_ship',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned_to_origin',
  'cancelled',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const RETURN_STATUSES = [
  'none',
  'requested',
  'approved',
  'picked_up',
  'received',
  'inspected',
  'completed',
  'rejected',
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const EXCHANGE_STATUSES = [
  'none',
  'requested',
  'approved',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'rejected',
] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

export const TIMELINE_EVENTS = [
  'order_placed',
  'order_confirmed',
  'payment_received',
  'payment_failed',
  'processing_started',
  'packed',
  'packing_slip_generated',
  'invoice_generated',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'return_approved',
  'return_picked',
  'return_received',
  'return_inspected',
  'returned',
  'exchange_requested',
  'exchange_approved',
  'exchange_shipped',
  'exchanged',
  'refund_requested',
  'refund_initiated',
  'refund_processed',
  'partially_refunded',
  'note_added',
  'status_updated',
  'admin_action',
] as const;
export type TimelineEvent = (typeof TIMELINE_EVENTS)[number];

// ============================================================
// DB ROW TYPES — extensions added by V2 migration
// ============================================================

/** Columns added to the `orders` table by the V2 migration */
export interface DbOrderV2Extensions {
  // Fulfillment
  fulfillment_status: FulfillmentStatus;
  // Shipment
  shipment_status: ShipmentStatus;
  courier_name: string | null;
  courier_awb: string | null;          // tracking number / AWB
  courier_url: string | null;          // public tracking URL
  shipping_weight_grams: number | null;
  shipping_dimensions: string | null;  // JSON string e.g. "10x20x5"
  shipped_at: string | null;
  delivered_at: string | null;
  expected_delivery_date: string | null;
  // Return / Exchange / Refund
  return_status: ReturnStatus;
  return_reason: string | null;
  return_notes: string | null;
  return_requested_at: string | null;
  return_completed_at: string | null;
  exchange_status: ExchangeStatus;
  exchange_order_id: string | null;    // FK to orders.id for the replacement
  refund_amount: number | null;
  refund_reference: string | null;
  refunded_at: string | null;
  // Documents
  invoice_number: string | null;
  invoice_generated_at: string | null;
  packing_slip_number: string | null;
  packing_slip_generated_at: string | null;
  // Notes
  internal_notes: string | null;
  customer_notes: string | null;
  packing_notes: string | null;
  // Extended payment
  payment_v2_status: PaymentV2Status;
  payment_gateway_response: Record<string, unknown> | null;
  // V2 order status (replaces legacy order_status for new orders)
  order_v2_status: OrderV2Status;
}

/** Full DB row: legacy + V2 extensions */
export interface DbOrderV2Row {
  id: string;
  order_number: string;
  user_id: string | null;
  // Customer
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  // Shipping address
  shipping_name: string;
  shipping_phone: string;
  shipping_email: string | null;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  // Financials
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  grand_total: number;
  currency: string;
  // Payment (legacy)
  payment_provider: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: string;
  order_status: string;
  // V2 extensions
  fulfillment_status: FulfillmentStatus;
  shipment_status: ShipmentStatus;
  courier_name: string | null;
  courier_awb: string | null;
  courier_url: string | null;
  shipping_weight_grams: number | null;
  shipping_dimensions: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  expected_delivery_date: string | null;
  return_status: ReturnStatus;
  return_reason: string | null;
  return_notes: string | null;
  return_requested_at: string | null;
  return_completed_at: string | null;
  exchange_status: ExchangeStatus;
  exchange_order_id: string | null;
  refund_amount: number | null;
  refund_reference: string | null;
  refunded_at: string | null;
  invoice_number: string | null;
  invoice_generated_at: string | null;
  packing_slip_number: string | null;
  packing_slip_generated_at: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  packing_notes: string | null;
  payment_v2_status: PaymentV2Status;
  payment_gateway_response: Record<string, unknown> | null;
  order_v2_status: OrderV2Status;
  // Timestamps
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  payment_verified_at: string | null;
}

/** order_items row extended for V2 */
export interface DbOrderItemV2Row {
  id: string;
  order_id: string;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  product_slug: string | null;
  product_sku: string | null;
  product_image: string | null;
  variant_sku: string | null;
  variant_color: string | null;
  variant_size: string | null;
  unit_price: number;
  mrp: number | null;
  quantity: number;
  line_total: number;
  returned_quantity: number;
  exchanged_quantity: number;
  is_gift: boolean;
  gift_message: string | null;
}

/** order_timeline row */
export interface DbOrderTimelineRow {
  id: string;
  order_id: string;
  event: TimelineEvent;
  actor_id: string | null;   // admin user id
  actor_name: string | null;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** order_shipments row */
export interface DbOrderShipmentRow {
  id: string;
  order_id: string;
  courier_name: string;
  awb_number: string;
  tracking_url: string | null;
  status: ShipmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  weight_grams: number | null;
  dimensions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// DOMAIN MODELS (camelCase)
// ============================================================

export interface OrderItemV2 {
  id: string;
  orderId: string;
  productId: number | null;
  variantId: number | null;
  productName: string;
  productSlug: string | null;
  productSku: string | null;
  productImage: string | null;
  variantSku: string | null;
  variantColor: string | null;
  variantSize: string | null;
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  lineTotal: number;
  returnedQuantity: number;
  exchangedQuantity: number;
  isGift: boolean;
  giftMessage: string | null;
}

export interface OrderTimelineEntry {
  id: string;
  orderId: string;
  event: TimelineEvent;
  actorId: string | null;
  actorName: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderShipment {
  id: string;
  orderId: string;
  courierName: string;
  awbNumber: string;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  weightGrams: number | null;
  dimensions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderV2 {
  // Identity
  id: string;
  orderNumber: string;
  userId: string | null;
  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  // Shipping
  shippingName: string;
  shippingPhone: string;
  shippingEmail: string | null;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  // Financials
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  currency: string;
  // Statuses
  orderStatus: string;          // legacy — kept for backward compat
  orderV2Status: OrderV2Status; // V2 canonical status
  paymentStatus: string;        // legacy
  paymentV2Status: PaymentV2Status;
  fulfillmentStatus: FulfillmentStatus;
  shipmentStatus: ShipmentStatus;
  returnStatus: ReturnStatus;
  exchangeStatus: ExchangeStatus;
  // Payment
  paymentProvider: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentGatewayResponse: Record<string, unknown> | null;
  // Shipment
  courierName: string | null;
  courierAwb: string | null;
  courierUrl: string | null;
  shippingWeightGrams: number | null;
  shippingDimensions: string | null;
  // Return / Exchange / Refund
  returnReason: string | null;
  returnNotes: string | null;
  returnRequestedAt: string | null;
  returnCompletedAt: string | null;
  exchangeOrderId: string | null;
  refundAmount: number | null;
  refundReference: string | null;
  refundedAt: string | null;
  // Documents
  invoiceNumber: string | null;
  invoiceGeneratedAt: string | null;
  packingSlipNumber: string | null;
  packingSlipGeneratedAt: string | null;
  // Notes
  internalNotes: string | null;
  customerNotes: string | null;
  packingNotes: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  expectedDeliveryDate: string | null;
  paymentVerifiedAt: string | null;
  // Relations (populated when requested)
  items?: OrderItemV2[];
  timeline?: OrderTimelineEntry[];
  shipments?: OrderShipment[];
}

// ============================================================
// SEARCH / FILTERS
// ============================================================

export interface OrderV2SearchFilters {
  q?: string;                        // search order number, customer name/email
  orderV2Status?: OrderV2Status;
  paymentV2Status?: PaymentV2Status;
  fulfillmentStatus?: FulfillmentStatus;
  returnStatus?: ReturnStatus;
  exchangeStatus?: ExchangeStatus;
  dateFrom?: string;                 // ISO date
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'updated_at' | 'grand_total' | 'order_number';
  sortDir?: 'asc' | 'desc';
}

export interface OrderV2SearchResult {
  data: OrderV2[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// WRITE PAYLOADS
// ============================================================

export interface ShipOrderPayload {
  courierName: string;
  awbNumber: string;
  trackingUrl?: string;
  weightGrams?: number;
  dimensions?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
}

export interface CancelOrderPayload {
  reason: string;
  actorId?: string;
  actorName?: string;
  refundAmount?: number;
}

export interface RefundPayload {
  amount: number;
  reason: string;
  reference?: string;
  actorId?: string;
  actorName?: string;
}

export interface ReturnPayload {
  reason: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
}

export interface ExchangePayload {
  reason: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
}

export interface AddTimelineNotePayload {
  note: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrderNotesPayload {
  internalNotes?: string;
  customerNotes?: string;
  packingNotes?: string;
}

export interface GenerateDocumentPayload {
  type: 'invoice' | 'packing_slip';
  actorId?: string;
  actorName?: string;
}
