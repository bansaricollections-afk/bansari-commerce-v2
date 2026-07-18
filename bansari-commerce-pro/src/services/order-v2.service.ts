/**
 * Order Management System V2 — Service
 *
 * This service owns all V2 order lifecycle operations.
 * The legacy order.service.ts is UNTOUCHED.
 *
 * Rules:
 *   - All DB writes use service-role client
 *   - No business logic is duplicated from product-v2.service
 *   - Every mutating action appends an immutable timeline entry
 *   - Inventory reserve/release goes through FulfillmentService (all RPCs)
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { OrderError, assertValidTransition } from '@/lib/order-errors';
import { mapOrderV2, mapOrderItemV2, mapOrderTimeline, mapOrderShipment } from '@/lib/order-mapper';
import { FulfillmentService } from '@/services/fulfillment.service';
import type {
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
  RefundPayload,
  ReturnPayload,
  ExchangePayload,
  AddTimelineNotePayload,
  UpdateOrderNotesPayload,
  GenerateDocumentPayload,
} from '@/types/order-v2';

const log = createLogger({ service: 'order-v2.service' });

// ============================================================
// SELECT CLAUSE
// ============================================================

const ORDER_V2_SELECT = `
  id, order_number, user_id,
  customer_name, customer_email, customer_phone,
  shipping_name, shipping_phone, shipping_email,
  shipping_address_line1, shipping_address_line2,
  shipping_city, shipping_state, shipping_postal_code, shipping_country,
  subtotal, discount, shipping_fee, tax, grand_total, currency,
  payment_provider, payment_method, payment_reference,
  razorpay_order_id, razorpay_payment_id,
  payment_status, order_status,
  order_v2_status, payment_v2_status, fulfillment_status, shipment_status,
  return_status, exchange_status,
  courier_name, courier_awb, courier_url,
  shipping_weight_grams, shipping_dimensions,
  return_reason, return_notes, return_requested_at, return_completed_at,
  exchange_order_id, refund_amount, refund_reference, refunded_at,
  invoice_number, invoice_generated_at,
  packing_slip_number, packing_slip_generated_at,
  internal_notes, customer_notes, packing_notes,
  payment_gateway_response,
  created_at, updated_at, paid_at, shipped_at, delivered_at,
  expected_delivery_date, payment_verified_at
`.trim();

// ============================================================
// PRIVATE HELPERS
// ============================================================

async function fetchOrderRelations(orderIds: string[]) {
  if (orderIds.length === 0)
    return { itemsByOrder: {}, timelineByOrder: {}, shipmentsByOrder: {} };

  const sb = createServiceRoleClient();
  const [itemsRes, timelineRes, shipmentsRes] = await Promise.all([
    sb.from('order_items').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
    sb.from('order_timeline').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
    sb.from('order_shipments').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
  ]);

  if (itemsRes.error)     throw new OrderError(itemsRes.error.message,     'INTERNAL');
  if (timelineRes.error)  throw new OrderError(timelineRes.error.message,   'INTERNAL');
  if (shipmentsRes.error) throw new OrderError(shipmentsRes.error.message,  'INTERNAL');

  const itemsByOrder: Record<string, DbOrderItemV2Row[]> = {};
  for (const row of (itemsRes.data ?? []) as DbOrderItemV2Row[]) {
    if (!itemsByOrder[row.order_id]) itemsByOrder[row.order_id] = [];
    itemsByOrder[row.order_id]!.push(row);
  }

  const timelineByOrder: Record<string, DbOrderTimelineRow[]> = {};
  for (const row of (timelineRes.data ?? []) as DbOrderTimelineRow[]) {
    if (!timelineByOrder[row.order_id]) timelineByOrder[row.order_id] = [];
    timelineByOrder[row.order_id]!.push(row);
  }

  const shipmentsByOrder: Record<string, DbOrderShipmentRow[]> = {};
  for (const row of (shipmentsRes.data ?? []) as DbOrderShipmentRow[]) {
    if (!shipmentsByOrder[row.order_id]) shipmentsByOrder[row.order_id] = [];
    shipmentsByOrder[row.order_id]!.push(row);
  }

  return { itemsByOrder, timelineByOrder, shipmentsByOrder };
}

async function appendTimeline(
  orderId: string,
  event: TimelineEvent,
  opts: {
    actorId?: string | null;
    actorName?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  } = {}
): Promise<void> {
  const sb = createServiceRoleClient();
  const { error } = await sb.from('order_timeline').insert({
    order_id:        orderId,
    event,
    actor_id:        opts.actorId   ?? null,
    actor_name:      opts.actorName ?? null,
    previous_status: opts.previousStatus ?? null,
    new_status:      opts.newStatus      ?? null,
    reason:          opts.reason         ?? null,
    metadata:        opts.metadata       ?? null,
    created_at:      new Date().toISOString(),
  });
  if (error) {
    log.error('order.timeline.write_failed', error, { orderId, event });
  }
}

async function getOrderRowOrThrow(id: string): Promise<DbOrderV2Row> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('orders')
    .select(ORDER_V2_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new OrderError(error.message, 'INTERNAL');
  if (!data)  throw new OrderError(`Order ${id} not found.`, 'NOT_FOUND');
  return data as DbOrderV2Row;
}

// ============================================================
// PUBLIC SERVICE
// ============================================================

export const OrderV2Service = {

  // ──────────────────────────────────────────────────────
  // SEARCH / LIST
  // ──────────────────────────────────────────────────────

  async search(filters: OrderV2SearchFilters): Promise<OrderV2SearchResult> {
    const sb = createServiceRoleClient();
    const page     = Math.max(0, filters.page     ?? 0);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const sortBy   = filters.sortBy  ?? 'created_at';
    const sortDir  = filters.sortDir ?? 'desc';
    const from     = page * pageSize;
    const to       = from + pageSize - 1;

    let query = sb
      .from('orders')
      .select(ORDER_V2_SELECT, { count: 'exact' })
      .range(from, to)
      .order(sortBy, { ascending: sortDir === 'asc' });

    if (filters.q) {
      query = query.or(
        `order_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,customer_email.ilike.%${filters.q}%,courier_awb.ilike.%${filters.q}%`
      );
    }
    if (filters.orderV2Status)      query = query.eq('order_v2_status',    filters.orderV2Status);
    if (filters.paymentV2Status)    query = query.eq('payment_v2_status',  filters.paymentV2Status);
    if (filters.fulfillmentStatus)  query = query.eq('fulfillment_status', filters.fulfillmentStatus);
    if (filters.returnStatus)       query = query.eq('return_status',      filters.returnStatus);
    if (filters.exchangeStatus)     query = query.eq('exchange_status',    filters.exchangeStatus);
    if (filters.dateFrom)           query = query.gte('created_at',        filters.dateFrom);
    if (filters.dateTo)             query = query.lte('created_at',        filters.dateTo);
    if (filters.minTotal !== undefined) query = query.gte('grand_total', filters.minTotal);
    if (filters.maxTotal !== undefined) query = query.lte('grand_total', filters.maxTotal);

    const { data, error, count } = await query;
    if (error) throw new OrderError(error.message, 'INTERNAL');

    const rows = (data ?? []) as DbOrderV2Row[];
    const ids  = rows.map((r) => r.id);
    const { itemsByOrder, timelineByOrder, shipmentsByOrder } = await fetchOrderRelations(ids);

    const orders = rows.map((row) =>
      mapOrderV2(row, {
        items:     itemsByOrder[row.id],
        timeline:  timelineByOrder[row.id],
        shipments: shipmentsByOrder[row.id],
      })
    );

    return { data: orders, total: count ?? 0, page, pageSize };
  },

  // ──────────────────────────────────────────────────────
  // GET BY ID
  // ──────────────────────────────────────────────────────

  async getById(id: string): Promise<OrderV2 | null> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('orders')
      .select(ORDER_V2_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new OrderError(error.message, 'INTERNAL');
    if (!data)  return null;

    const row = data as DbOrderV2Row;
    const { itemsByOrder, timelineByOrder, shipmentsByOrder } = await fetchOrderRelations([row.id]);
    return mapOrderV2(row, {
      items:     itemsByOrder[row.id],
      timeline:  timelineByOrder[row.id],
      shipments: shipmentsByOrder[row.id],
    });
  },

  // ──────────────────────────────────────────────────────
  // CONFIRM ORDER
  // ──────────────────────────────────────────────────────

  async confirm(
    orderId: string,
    opts?: { actorId?: string; actorName?: string }
  ): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    const from = row.order_v2_status;
    assertValidTransition(from, 'confirmed');

    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status: 'confirmed',
        order_status:    'processing',
        updated_at:      new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    // Keep reservation in place (confirmed = reserved)
    await appendTimeline(orderId, 'order_confirmed', {
      previousStatus: from,
      newStatus:      'confirmed',
      actorId:        opts?.actorId,
      actorName:      opts?.actorName,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // UPDATE STATUS (generic)
  // ──────────────────────────────────────────────────────

  async updateStatus(
    orderId: string,
    newStatus: OrderV2Status,
    opts?: { actorId?: string; actorName?: string; reason?: string }
  ): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    const from = row.order_v2_status;
    assertValidTransition(from, newStatus);

    const sb = createServiceRoleClient();
    const updatePayload: Record<string, unknown> = {
      order_v2_status: newStatus,
      updated_at:      new Date().toISOString(),
    };

    const legacyMap: Partial<Record<OrderV2Status, string>> = {
      confirmed:    'processing',
      processing:   'processing',
      packed:       'packed',
      shipped:      'shipped',
      delivered:    'delivered',
      cancelled:    'cancelled',
    };
    if (legacyMap[newStatus]) updatePayload.order_status = legacyMap[newStatus];

    const { data, error } = await sb
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    await appendTimeline(orderId, 'status_updated', {
      previousStatus: from,
      newStatus,
      actorId:   opts?.actorId,
      actorName: opts?.actorName,
      reason:    opts?.reason,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // PACK
  // ──────────────────────────────────────────────────────

  async pack(
    orderId: string,
    opts?: { actorId?: string; actorName?: string; packingNotes?: string }
  ): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    assertValidTransition(row.order_v2_status, 'packed');

    const sb = createServiceRoleClient();
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      order_v2_status:  'packed',
      order_status:     'packed',
      fulfillment_status: 'partial',
      updated_at:       now,
    };
    if (opts?.packingNotes) updatePayload.packing_notes = opts.packingNotes;

    const { data, error } = await sb
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    await appendTimeline(orderId, 'packed', {
      previousStatus: row.order_v2_status,
      newStatus:      'packed',
      actorId:        opts?.actorId,
      actorName:      opts?.actorName,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // SHIP
  // ──────────────────────────────────────────────────────

  async ship(orderId: string, payload: ShipOrderPayload): Promise<OrderV2> {
    if (!payload.courierName) throw new OrderError('Courier name is required.', 'COURIER_REQUIRED');
    if (!payload.awbNumber)   throw new OrderError('AWB / tracking number is required.', 'AWB_REQUIRED');

    const row = await getOrderRowOrThrow(orderId);
    assertValidTransition(row.order_v2_status, 'shipped');

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();

    await sb.from('order_shipments').insert({
      order_id:    orderId,
      courier_name: payload.courierName,
      awb_number:   payload.awbNumber,
      tracking_url: payload.trackingUrl   ?? null,
      status:       'picked_up',
      shipped_at:   now,
      weight_grams: payload.weightGrams   ?? null,
      dimensions:   payload.dimensions    ?? null,
      notes:        payload.notes         ?? null,
      created_at:   now,
      updated_at:   now,
    });

    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status:          'shipped',
        order_status:             'shipped',
        shipment_status:          'picked_up',
        fulfillment_status:       'fulfilled',
        courier_name:             payload.courierName,
        courier_awb:              payload.awbNumber,
        courier_url:              payload.trackingUrl          ?? null,
        shipping_weight_grams:    payload.weightGrams          ?? null,
        shipping_dimensions:      payload.dimensions           ?? null,
        expected_delivery_date:   payload.expectedDeliveryDate ?? null,
        shipped_at:               now,
        updated_at:               now,
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    await appendTimeline(orderId, 'shipped', {
      previousStatus: row.order_v2_status,
      newStatus:      'shipped',
      actorId:        payload.actorId,
      actorName:      payload.actorName,
      metadata: {
        courier:     payload.courierName,
        awb:         payload.awbNumber,
        trackingUrl: payload.trackingUrl,
      },
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // DELIVER — converts reservation → permanent sale
  // ──────────────────────────────────────────────────────

  async deliver(
    orderId: string,
    opts?: { actorId?: string; actorName?: string }
  ): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    assertValidTransition(row.order_v2_status, 'delivered');

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();

    await sb
      .from('order_shipments')
      .update({ status: 'delivered', delivered_at: now, updated_at: now })
      .eq('order_id', orderId)
      .eq('status', 'picked_up');

    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status:    'delivered',
        order_status:       'delivered',
        shipment_status:    'delivered',
        fulfillment_status: 'fulfilled',
        delivered_at:       now,
        updated_at:         now,
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    // ✅ Convert reservation → permanent sale (best-effort, logged)
    await FulfillmentService.finaliseSaleForOrder(orderId, opts);

    await appendTimeline(orderId, 'delivered', {
      previousStatus: row.order_v2_status,
      newStatus:      'delivered',
      actorId:        opts?.actorId,
      actorName:      opts?.actorName,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // CANCEL — releases reservation
  // ──────────────────────────────────────────────────────

  async cancel(orderId: string, payload: CancelOrderPayload): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    if (row.order_v2_status === 'cancelled') {
      throw new OrderError('Order is already cancelled.', 'ALREADY_CANCELLED');
    }
    assertValidTransition(row.order_v2_status, 'cancelled');

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      order_v2_status:    'cancelled',
      order_status:       'cancelled',
      fulfillment_status: 'cancelled',
      internal_notes:     payload.reason,
      updated_at:         now,
    };
    if (payload.refundAmount !== undefined) {
      updatePayload.refund_amount    = payload.refundAmount;
      updatePayload.refund_requested = true;
    }

    const { data, error } = await sb
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    // ✅ Release inventory reservation through FulfillmentService
    await FulfillmentService.releaseForOrder(orderId, {
      actorId:   payload.actorId,
      actorName: payload.actorName,
      reason:    payload.reason,
    });

    await appendTimeline(orderId, 'cancelled', {
      previousStatus: row.order_v2_status,
      newStatus:      'cancelled',
      actorId:        payload.actorId,
      actorName:      payload.actorName,
      reason:         payload.reason,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // REFUND — optionally restores inventory
  // ──────────────────────────────────────────────────────

  async refund(orderId: string, payload: RefundPayload): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    if (row.order_v2_status === 'refunded') {
      throw new OrderError('Order is already fully refunded.', 'ALREADY_REFUNDED');
    }
    if (payload.amount <= 0 || payload.amount > Number(row.grand_total)) {
      throw new OrderError(
        `Refund amount must be between 0.01 and ${row.grand_total}.`,
        'INVALID_REFUND_AMOUNT'
      );
    }

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();
    const isPartial = payload.amount < Number(row.grand_total);
    const newStatus: OrderV2Status = isPartial ? 'partially_refunded' : 'refunded';
    const newPaymentStatus: PaymentV2Status = isPartial ? 'partially_refunded' : 'refunded';

    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status:   newStatus,
        payment_v2_status: newPaymentStatus,
        refund_amount:     payload.amount,
        refund_reference:  payload.reference   ?? null,
        refunded_at:       now,
        updated_at:        now,
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    // ✅ Configurable: restore inventory on refund (only when restoreInventory flag is set)
    if (payload.restoreInventory) {
      await FulfillmentService.restoreStockForOrder(orderId, 'refund', {
        actorId:   payload.actorId,
        actorName: payload.actorName,
        reason:    payload.reason,
      });
    }

    await appendTimeline(orderId, 'refund_processed', {
      previousStatus: row.order_v2_status,
      newStatus,
      actorId:   payload.actorId,
      actorName: payload.actorName,
      reason:    payload.reason,
      metadata:  {
        amount:            payload.amount,
        reference:         payload.reference,
        partial:           isPartial,
        restoreInventory:  payload.restoreInventory ?? false,
      },
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // RETURN — restores inventory when goods received back
  // ──────────────────────────────────────────────────────

  async requestReturn(orderId: string, payload: ReturnPayload): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    if (!['delivered', 'shipped', 'out_for_delivery'].includes(row.order_v2_status)) {
      throw new OrderError('Returns can only be requested after delivery.', 'RETURN_NOT_ALLOWED');
    }

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status:      'return_requested',
        return_status:        'requested',
        return_reason:        payload.reason,
        return_notes:         payload.notes   ?? null,
        return_requested_at:  now,
        updated_at:           now,
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    // ✅ Restore inventory — item is physically coming back to warehouse
    await FulfillmentService.restoreStockForOrder(orderId, 'return', {
      actorId:   payload.actorId,
      actorName: payload.actorName,
      reason:    payload.reason,
    });

    await appendTimeline(orderId, 'return_requested', {
      previousStatus: row.order_v2_status,
      newStatus:      'return_requested',
      actorId:        payload.actorId,
      actorName:      payload.actorName,
      reason:         payload.reason,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // EXCHANGE
  // ──────────────────────────────────────────────────────

  async requestExchange(orderId: string, payload: ExchangePayload): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    if (!['delivered'].includes(row.order_v2_status)) {
      throw new OrderError('Exchanges can only be requested after delivery.', 'EXCHANGE_NOT_ALLOWED');
    }

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('orders')
      .update({
        order_v2_status:  'exchange_requested',
        exchange_status:  'requested',
        updated_at:       now,
      })
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    await appendTimeline(orderId, 'exchange_requested', {
      previousStatus: row.order_v2_status,
      newStatus:      'exchange_requested',
      actorId:        payload.actorId,
      actorName:      payload.actorName,
      reason:         payload.reason,
    });

    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // NOTES
  // ──────────────────────────────────────────────────────

  async updateNotes(orderId: string, payload: UpdateOrderNotesPayload): Promise<OrderV2> {
    const row = await getOrderRowOrThrow(orderId);
    const sb  = createServiceRoleClient();
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('internalNotes' in payload) updatePayload.internal_notes = payload.internalNotes ?? null;
    if ('customerNotes' in payload) updatePayload.customer_notes = payload.customerNotes ?? null;
    if ('packingNotes'  in payload) updatePayload.packing_notes  = payload.packingNotes  ?? null;

    const { data, error } = await sb
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select(ORDER_V2_SELECT)
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    void row;
    return mapOrderV2(data as DbOrderV2Row);
  },

  // ──────────────────────────────────────────────────────
  // TIMELINE NOTE
  // ──────────────────────────────────────────────────────

  async addTimelineNote(
    orderId: string,
    payload: AddTimelineNotePayload
  ): Promise<OrderTimelineEntry> {
    await getOrderRowOrThrow(orderId);

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('order_timeline')
      .insert({
        order_id:   orderId,
        event:      'note_added',
        actor_id:   payload.actorId   ?? null,
        actor_name: payload.actorName ?? null,
        reason:     payload.note,
        metadata:   payload.metadata  ?? null,
        created_at: now,
      })
      .select('*')
      .single();
    if (error) throw new OrderError(error.message, 'INTERNAL');

    return mapOrderTimeline(data as DbOrderTimelineRow);
  },

  // ──────────────────────────────────────────────────────
  // GENERATE DOCUMENTS
  // ──────────────────────────────────────────────────────

  async generateDocument(
    orderId: string,
    payload: GenerateDocumentPayload
  ): Promise<{ number: string; generatedAt: string }> {
    await getOrderRowOrThrow(orderId);

    const sb  = createServiceRoleClient();
    const now = new Date().toISOString();

    const fnName = payload.type === 'invoice'
      ? 'generate_invoice_number'
      : 'generate_packing_slip_number';

    const { data: numData, error: numErr } = await sb.rpc(fnName as 'generate_invoice_number');
    if (numErr) throw new OrderError(numErr.message, 'INTERNAL');

    const docNumber = String(numData ?? '');
    const updatePayload: Record<string, unknown> = { updated_at: now };
    const timelineEvent: TimelineEvent = payload.type === 'invoice'
      ? 'invoice_generated'
      : 'packing_slip_generated';

    if (payload.type === 'invoice') {
      updatePayload.invoice_number        = docNumber;
      updatePayload.invoice_generated_at  = now;
    } else {
      updatePayload.packing_slip_number        = docNumber;
      updatePayload.packing_slip_generated_at  = now;
    }

    const { error: updateErr } = await sb.from('orders').update(updatePayload).eq('id', orderId);
    if (updateErr) throw new OrderError(updateErr.message, 'INTERNAL');

    await appendTimeline(orderId, timelineEvent, {
      actorId:   payload.actorId,
      actorName: payload.actorName,
      metadata:  { type: payload.type, number: docNumber },
    });

    return { number: docNumber, generatedAt: now };
  },

  // ──────────────────────────────────────────────────────
  // GET TIMELINE
  // ──────────────────────────────────────────────────────

  async getTimeline(orderId: string): Promise<OrderTimelineEntry[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw new OrderError(error.message, 'INTERNAL');
    return ((data ?? []) as DbOrderTimelineRow[]).map(mapOrderTimeline);
  },

  // ──────────────────────────────────────────────────────
  // GET SHIPMENTS
  // ──────────────────────────────────────────────────────

  async getShipments(orderId: string): Promise<OrderShipment[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('order_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) throw new OrderError(error.message, 'INTERNAL');
    return ((data ?? []) as DbOrderShipmentRow[]).map(mapOrderShipment);
  },

  // ──────────────────────────────────────────────────────
  // LEGACY STUBS (delegated to FulfillmentService)
  // Kept for backward-compat; callers should prefer FulfillmentService directly
  // ──────────────────────────────────────────────────────

  async reserveInventory(orderId: string): Promise<void> {
    return FulfillmentService.reserveForOrder(orderId);
  },

  async releaseInventory(orderId: string): Promise<void> {
    return FulfillmentService.releaseForOrder(orderId);
  },
};

export type { OrderV2, OrderItemV2, OrderTimelineEntry, OrderShipment, OrderV2SearchResult };
