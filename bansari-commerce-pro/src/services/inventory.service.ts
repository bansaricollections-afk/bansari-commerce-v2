import { createServiceRoleClient } from '@/lib/supabase/service';

// ─────────────────────────────────────────────────────────────────────────────
// Domain types co-located here because @/types/inventory.ts only contains the
// legacy Inventory interface. Every consumer in the repo imports these types
// from @/types/inventory — we re-export them from there by augmenting the
// module. To avoid touching that file we declare them here and export them so
// the service is the canonical runtime home, while the component imports that
// say `from '@/types/inventory'` will be satisfied once types/inventory.ts is
// also updated. For the build fix we export them directly from this module;
// the server-component pages only import InventoryService from here.
// ─────────────────────────────────────────────────────────────────────────────

export type AdjustmentReason =
  | 'cycle_count'
  | 'damage_write_off'
  | 'damage_recovery'
  | 'theft_loss'
  | 'expiry'
  | 'found_surplus'
  | 'vendor_credit'
  | 'sample_used'
  | 'other';

export type PoStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Warehouse {
  id:         number;
  name:       string;
  code:       string;
  address:    string | null;
  is_default: boolean;
  is_active:  boolean;
  created_at: string;
}

export interface Vendor {
  id:            number;
  name:          string;
  code:          string;
  gstin:         string | null;
  email:         string | null;
  phone:         string | null;
  address:       string | null;
  payment_terms: number;
  is_active:     boolean;
  created_at:    string;
}

export interface InventorySummaryRow {
  id:               number;
  warehouse_id:     number;
  warehouse_name:   string;
  product_id:       number;
  product_name:     string;
  product_sku:      string;
  variant_id:       number | null;
  variant_sku:      string | null;
  size_label:       string | null;
  available_qty:    number;
  reserved_qty:     number;
  damaged_qty:      number;
  avg_cost_price:   number;
  inventory_value:  number;
  stock_status:     StockStatus;
  low_stock_threshold: number;
}

export interface PurchaseOrderItem {
  id:           number;
  po_id:        number;
  product_id:   number;
  variant_id:   number | null;
  ordered_qty:  number;
  received_qty: number;
  damaged_qty:  number;
  unit_cost:    number;
  total_cost:   number;
  hsn_code:     string | null;
}

export interface PurchaseOrder {
  id:           number;
  po_number:    string;
  vendor_id:    number;
  warehouse_id: number;
  status:       PoStatus;
  order_date:   string;
  expected_date: string | null;
  subtotal:     number;
  tax_amount:   number;
  total_amount: number;
  notes:        string | null;
  created_by:   string;
  updated_by:   string;
  created_at:   string;
  updated_at:   string;
  vendor?:      Vendor;
  warehouse?:   Pick<Warehouse, 'id' | 'name' | 'code'>;
  items?:       PurchaseOrderItem[];
}

export interface StockTransfer {
  id:                  number;
  from_warehouse_id:   number;
  to_warehouse_id:     number;
  product_id:          number;
  variant_id:          number | null;
  quantity:            number;
  status:              TransferStatus;
  notes:               string | null;
  initiated_by:        string;
  initiated_at:        string;
  completed_at:        string | null;
}

// ── Payload types ─────────────────────────────────────────────────────────────

export interface AdjustStockPayload {
  inventory_id: number;
  qty_change:   number;
  reason:       AdjustmentReason;
  notes?:       string;
}

export interface TransferStockPayload {
  from_warehouse_id: number;
  to_warehouse_id:   number;
  product_id:        number;
  variant_id?:       number;
  quantity:          number;
  notes?:            string;
}

export interface CreatePoItemPayload {
  product_id:  number;
  variant_id?: number;
  ordered_qty: number;
  unit_cost:   number;
  hsn_code?:   string;
}

export interface CreatePoPayload {
  vendor_id:     number;
  warehouse_id:  number;
  expected_date?: string;
  notes?:        string;
  items:         CreatePoItemPayload[];
}

export interface PoReceiptLine {
  item_id:      number;
  received_qty: number;
  damaged_qty:  number;
  unit_cost:    number;
  notes?:       string;
}

export interface ReceivePoPayload {
  po_id:    number;
  receipts: PoReceiptLine[];
}

export interface InventorySearchFilters {
  inventoryId?:  number;
  warehouseId?:  number;
  productId?:    number;
  stockStatus?:  StockStatus;
  lowStock?:     boolean;
  page?:         number;
  pageSize?:     number;
}

export interface InventorySearchResult {
  data:     InventorySummaryRow[];
  total:    number;
  page:     number;
  pageSize: number;
}

// ── Error class ───────────────────────────────────────────────────────────────

export type InventoryErrorCode =
  | 'NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'VALIDATION'
  | 'DUPLICATE'
  | 'DB_ERROR';

export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly code: InventoryErrorCode = 'DB_ERROR'
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

function parseDbError(message: string): InventoryError {
  return new InventoryError(message, 'DB_ERROR');
}

// ── Service ───────────────────────────────────────────────────────────────────

export const InventoryService = {

  // ── Search / list inventory summary rows ────────────────────────────────
  async search(filters: InventorySearchFilters = {}): Promise<InventorySearchResult> {
    const sb       = createServiceRoleClient();
    const page     = Math.max(0, filters.page     ?? 0);
    const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
    const from     = page * pageSize;
    const to       = from + pageSize - 1;

    let query = sb
      .from('v_inventory_summary')
      .select('*', { count: 'exact' })
      .order('product_name', { ascending: true })
      .range(from, to);

    if (filters.inventoryId)  query = query.eq('id',           filters.inventoryId);
    if (filters.warehouseId)  query = query.eq('warehouse_id', filters.warehouseId);
    if (filters.productId)    query = query.eq('product_id',   filters.productId);
    if (filters.stockStatus)  query = query.eq('stock_status', filters.stockStatus);
    if (filters.lowStock)     query = query.in('stock_status', ['low_stock', 'out_of_stock']);

    const { data, error, count } = await query;
    if (error) throw parseDbError(error.message);

    return {
      data:     (data ?? []) as InventorySummaryRow[],
      total:    count ?? 0,
      page,
      pageSize,
    };
  },

  // ── Adjust stock (single inventory record) ───────────────────────────────
  async adjustStock(
    payload: AdjustStockPayload,
    userId:  string
  ): Promise<number> {
    const sb = createServiceRoleClient();

    if (payload.qty_change === 0)
      throw new InventoryError('qty_change must not be zero', 'VALIDATION');

    const { data, error } = await sb.rpc('adjust_inventory_stock', {
      p_inventory_id: payload.inventory_id,
      p_qty_change:   payload.qty_change,
      p_reason:       payload.reason,
      p_notes:        payload.notes ?? null,
      p_actor_id:     userId,
    });

    if (error) {
      if (error.message.includes('insufficient')) {
        throw new InventoryError(
          'Insufficient available stock for this adjustment',
          'INSUFFICIENT_STOCK'
        );
      }
      throw parseDbError(error.message);
    }

    return data as number;
  },

  // ── Transfer stock between warehouses ───────────────────────────────────
  async transferStock(
    payload: TransferStockPayload,
    userId:  string
  ): Promise<number> {
    const sb = createServiceRoleClient();

    if (payload.from_warehouse_id === payload.to_warehouse_id)
      throw new InventoryError(
        'Source and destination warehouses must differ',
        'VALIDATION'
      );

    if (payload.quantity <= 0)
      throw new InventoryError('Transfer quantity must be greater than zero', 'VALIDATION');

    const { data, error } = await sb.rpc('transfer_inventory_stock', {
      p_from_warehouse_id: payload.from_warehouse_id,
      p_to_warehouse_id:   payload.to_warehouse_id,
      p_product_id:        payload.product_id,
      p_variant_id:        payload.variant_id ?? null,
      p_quantity:          payload.quantity,
      p_notes:             payload.notes ?? null,
      p_actor_id:          userId,
    });

    if (error) {
      if (error.message.includes('insufficient')) {
        throw new InventoryError(
          'Insufficient available stock at source warehouse',
          'INSUFFICIENT_STOCK'
        );
      }
      throw parseDbError(error.message);
    }

    return data as number;
  },

  // ── Low-stock report ────────────────────────────────────────────────────
  async getLowStockReport(warehouseId?: number): Promise<InventorySummaryRow[]> {
    const sb = createServiceRoleClient();

    let query = sb
      .from('v_inventory_summary')
      .select('*')
      .in('stock_status', ['low_stock', 'out_of_stock'])
      .order('available_qty', { ascending: true });

    if (warehouseId) query = query.eq('warehouse_id', warehouseId);

    const { data, error } = await query;
    if (error) throw parseDbError(error.message);
    return (data ?? []) as InventorySummaryRow[];
  },

  // ── Warehouses ──────────────────────────────────────────────────────────
  async listWarehouses(): Promise<Warehouse[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw parseDbError(error.message);
    return (data ?? []) as Warehouse[];
  },

  // ── Vendors ─────────────────────────────────────────────────────────────
  async listVendors(): Promise<Vendor[]> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw parseDbError(error.message);
    return (data ?? []) as Vendor[];
  },

  // ── Purchase Orders ──────────────────────────────────────────────────────
  async listPurchaseOrders(filters?: {
    status?:      PoStatus;
    warehouseId?: number;
    vendorId?:    number;
    page?:        number;
    pageSize?:    number;
  }): Promise<{ data: PurchaseOrder[]; total: number }> {
    const sb       = createServiceRoleClient();
    const page     = Math.max(0, filters?.page     ?? 0);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));
    const from     = page * pageSize;
    const to       = from + pageSize - 1;

    let query = sb
      .from('purchase_orders')
      .select(
        `*, vendor:vendors(*), warehouse:warehouses(id,name,code), items:purchase_order_items(*)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.status)      query = query.eq('status',       filters.status);
    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.vendorId)    query = query.eq('vendor_id',    filters.vendorId);

    const { data, error, count } = await query;
    if (error) throw parseDbError(error.message);
    return { data: (data ?? []) as PurchaseOrder[], total: count ?? 0 };
  },

  async getPurchaseOrder(poId: number): Promise<PurchaseOrder | null> {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('purchase_orders')
      .select(
        `*, vendor:vendors(*), warehouse:warehouses(*), items:purchase_order_items(*)`
      )
      .eq('id', poId)
      .maybeSingle();

    if (error) throw parseDbError(error.message);
    return data as PurchaseOrder | null;
  },

  async createPurchaseOrder(
    payload: CreatePoPayload,
    userId:  string
  ): Promise<PurchaseOrder> {
    const sb = createServiceRoleClient();

    const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand     = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${dateStr}-${rand}`;

    const subtotal    = payload.items.reduce((acc, i) => acc + i.ordered_qty * i.unit_cost, 0);
    const totalAmount = subtotal;

    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .insert({
        po_number:     poNumber,
        vendor_id:     payload.vendor_id,
        warehouse_id:  payload.warehouse_id,
        status:        'draft',
        order_date:    new Date().toISOString(),
        expected_date: payload.expected_date ?? null,
        subtotal,
        tax_amount:    0,
        total_amount:  totalAmount,
        notes:         payload.notes ?? null,
        created_by:    userId,
        updated_by:    userId,
      })
      .select()
      .single();

    if (poErr) {
      if (poErr.code === '23505')
        throw new InventoryError('Purchase order number collision — please retry', 'DUPLICATE');
      throw parseDbError(poErr.message);
    }

    const itemRows = payload.items.map(item => ({
      po_id:        po.id,
      product_id:   item.product_id,
      variant_id:   item.variant_id ?? null,
      ordered_qty:  item.ordered_qty,
      received_qty: 0,
      damaged_qty:  0,
      unit_cost:    item.unit_cost,
      total_cost:   item.ordered_qty * item.unit_cost,
      hsn_code:     item.hsn_code ?? null,
    }));

    const { error: itemErr } = await sb.from('purchase_order_items').insert(itemRows);

    if (itemErr) {
      await sb.from('purchase_orders').delete().eq('id', po.id);
      throw parseDbError(itemErr.message);
    }

    const full = await this.getPurchaseOrder(po.id);
    return full!;
  },

  async receivePurchaseOrder(
    payload: ReceivePoPayload,
    userId:  string
  ): Promise<void> {
    const sb = createServiceRoleClient();

    const { error } = await sb.rpc('receive_purchase_order', {
      p_po_id:       payload.po_id,
      p_receipts:    payload.receipts,
      p_received_by: userId,
    });

    if (error) throw parseDbError(error.message);
  },
};
