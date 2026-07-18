/**
 * Order V2 — Mapper
 * Converts DB snake_case rows → camelCase domain models.
 */
import type {
  DbOrderV2Row,
  DbOrderItemV2Row,
  DbOrderTimelineRow,
  DbOrderShipmentRow,
  OrderV2,
  OrderItemV2,
  OrderTimelineEntry,
  OrderShipment,
} from '@/types/order-v2';
import type { FulfillmentStatus, ShipmentStatus, ReturnStatus, ExchangeStatus, OrderV2Status, PaymentV2Status } from '@/types/order-v2';

export function mapOrderItemV2(row: DbOrderItemV2Row): OrderItemV2 {
  return {
    id:               row.id,
    orderId:          row.order_id,
    productId:        row.product_id,
    variantId:        row.variant_id,
    productName:      row.product_name,
    productSlug:      row.product_slug,
    productSku:       row.product_sku,
    productImage:     row.product_image,
    variantSku:       row.variant_sku,
    variantColor:     row.variant_color,
    variantSize:      row.variant_size,
    unitPrice:        row.unit_price,
    mrp:              row.mrp,
    quantity:         row.quantity,
    lineTotal:        row.line_total,
    returnedQuantity: row.returned_quantity,
    exchangedQuantity:row.exchanged_quantity,
    isGift:           row.is_gift,
    giftMessage:      row.gift_message,
  };
}

export function mapOrderTimeline(row: DbOrderTimelineRow): OrderTimelineEntry {
  return {
    id:             row.id,
    orderId:        row.order_id,
    event:          row.event,
    actorId:        row.actor_id,
    actorName:      row.actor_name,
    previousStatus: row.previous_status,
    newStatus:      row.new_status,
    reason:         row.reason,
    metadata:       row.metadata,
    createdAt:      row.created_at,
  };
}

export function mapOrderShipment(row: DbOrderShipmentRow): OrderShipment {
  return {
    id:           row.id,
    orderId:      row.order_id,
    courierName:  row.courier_name,
    awbNumber:    row.awb_number,
    trackingUrl:  row.tracking_url,
    status:       row.status,
    shippedAt:    row.shipped_at,
    deliveredAt:  row.delivered_at,
    weightGrams:  row.weight_grams,
    dimensions:   row.dimensions,
    notes:        row.notes,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

export function mapOrderV2(
  row: DbOrderV2Row,
  opts?: {
    items?: DbOrderItemV2Row[];
    timeline?: DbOrderTimelineRow[];
    shipments?: DbOrderShipmentRow[];
  }
): OrderV2 {
  return {
    id:                       row.id,
    orderNumber:              row.order_number,
    userId:                   row.user_id,
    customerName:             row.customer_name,
    customerEmail:            row.customer_email,
    customerPhone:            row.customer_phone,
    shippingName:             row.shipping_name,
    shippingPhone:            row.shipping_phone,
    shippingEmail:            row.shipping_email,
    shippingAddressLine1:     row.shipping_address_line1,
    shippingAddressLine2:     row.shipping_address_line2,
    shippingCity:             row.shipping_city,
    shippingState:            row.shipping_state,
    shippingPostalCode:       row.shipping_postal_code,
    shippingCountry:          row.shipping_country,
    subtotal:                 Number(row.subtotal),
    discount:                 Number(row.discount),
    shippingFee:              Number(row.shipping_fee),
    tax:                      Number(row.tax),
    grandTotal:               Number(row.grand_total),
    currency:                 row.currency,
    orderStatus:              row.order_status,
    orderV2Status:            (row.order_v2_status ?? 'pending') as OrderV2Status,
    paymentStatus:            row.payment_status,
    paymentV2Status:          (row.payment_v2_status ?? 'pending') as PaymentV2Status,
    fulfillmentStatus:        (row.fulfillment_status ?? 'unfulfilled') as FulfillmentStatus,
    shipmentStatus:           (row.shipment_status ?? 'pending') as ShipmentStatus,
    returnStatus:             (row.return_status ?? 'none') as ReturnStatus,
    exchangeStatus:           (row.exchange_status ?? 'none') as ExchangeStatus,
    paymentProvider:          row.payment_provider,
    paymentMethod:            row.payment_method,
    paymentReference:         row.payment_reference,
    razorpayOrderId:          row.razorpay_order_id,
    razorpayPaymentId:        row.razorpay_payment_id,
    paymentGatewayResponse:   row.payment_gateway_response,
    courierName:              row.courier_name,
    courierAwb:               row.courier_awb,
    courierUrl:               row.courier_url,
    shippingWeightGrams:      row.shipping_weight_grams,
    shippingDimensions:       row.shipping_dimensions,
    returnReason:             row.return_reason,
    returnNotes:              row.return_notes,
    returnRequestedAt:        row.return_requested_at,
    returnCompletedAt:        row.return_completed_at,
    exchangeOrderId:          row.exchange_order_id,
    refundAmount:             row.refund_amount,
    refundReference:          row.refund_reference,
    refundedAt:               row.refunded_at,
    invoiceNumber:            row.invoice_number,
    invoiceGeneratedAt:       row.invoice_generated_at,
    packingSlipNumber:        row.packing_slip_number,
    packingSlipGeneratedAt:   row.packing_slip_generated_at,
    internalNotes:            row.internal_notes,
    customerNotes:            row.customer_notes,
    packingNotes:             row.packing_notes,
    createdAt:                row.created_at,
    updatedAt:                row.updated_at,
    paidAt:                   row.paid_at,
    shippedAt:                row.shipped_at,
    deliveredAt:              row.delivered_at,
    expectedDeliveryDate:     row.expected_delivery_date,
    paymentVerifiedAt:        row.payment_verified_at,
    items:     opts?.items     ? opts.items.map(mapOrderItemV2)         : undefined,
    timeline:  opts?.timeline  ? opts.timeline.map(mapOrderTimeline)    : undefined,
    shipments: opts?.shipments ? opts.shipments.map(mapOrderShipment)   : undefined,
  };
}
