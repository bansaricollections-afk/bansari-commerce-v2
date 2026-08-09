'use server';

import { revalidatePath }    from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { requireAdminAction } from '@/lib/auth/requireAdmin';
import {
  InventoryService,
  InventoryError,
  type AdjustStockPayload,
  type TransferStockPayload,
  type CreatePoPayload,
  type ReceivePoPayload,
} from '@/services/inventory.service';

// ── Shared result type ────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string; code?: string };

const UNAUTHORIZED: ActionResult<never> = {
  ok: false,
  error: 'Admin authorization required',
  code: 'FORBIDDEN',
};

// ── adjustStockAction ─────────────────────────────────────────────────────────

export async function adjustStockAction(
  payload: AdjustStockPayload
): Promise<ActionResult<{ adjustmentId: number }>> {
  try {
    const admin = await requireAdminAction();
    if (!admin) return UNAUTHORIZED;

    if (!payload.inventory_id || payload.qty_change === undefined || !payload.reason) {
      return { ok: false, error: 'inventory_id, qty_change, and reason are required', code: 'VALIDATION' };
    }
    if (payload.qty_change === 0) {
      return { ok: false, error: 'qty_change must not be zero', code: 'VALIDATION' };
    }

    const adjustmentId = await InventoryService.adjustStock(payload, admin.userId);
    revalidatePath('/admin/inventory');
    return { ok: true, data: { adjustmentId } };
  } catch (err) {
    if (err instanceof InventoryError)
      return { ok: false, error: err.message, code: err.code };
    console.error('[adjustStockAction]', err);
    return { ok: false, error: 'Unexpected error during stock adjustment' };
  }
}

// ── transferStockAction ───────────────────────────────────────────────────────

export async function transferStockAction(
  payload: TransferStockPayload
): Promise<ActionResult<{ transferId: number }>> {
  try {
    const admin = await requireAdminAction();
    if (!admin) return UNAUTHORIZED;

    if (payload.from_warehouse_id === payload.to_warehouse_id) {
      return { ok: false, error: 'Source and destination warehouses must differ', code: 'VALIDATION' };
    }
    if (!payload.quantity || payload.quantity <= 0) {
      return { ok: false, error: 'Quantity must be greater than zero', code: 'VALIDATION' };
    }

    const transferId = await InventoryService.transferStock(payload, admin.userId);
    revalidatePath('/admin/inventory');
    return { ok: true, data: { transferId } };
  } catch (err) {
    if (err instanceof InventoryError)
      return { ok: false, error: err.message, code: err.code };
    console.error('[transferStockAction]', err);
    return { ok: false, error: 'Unexpected error during stock transfer' };
  }
}

// ── createPurchaseOrderAction ─────────────────────────────────────────────────

export async function createPurchaseOrderAction(
  payload: CreatePoPayload
): Promise<ActionResult<{ poId: number; poNumber: string }>> {
  try {
    const admin = await requireAdminAction();
    if (!admin) return UNAUTHORIZED;

    if (!payload.vendor_id || !payload.warehouse_id) {
      return { ok: false, error: 'vendor_id and warehouse_id are required', code: 'VALIDATION' };
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { ok: false, error: 'At least one line item is required', code: 'VALIDATION' };
    }

    const po = await InventoryService.createPurchaseOrder(payload, admin.userId);
    revalidatePath('/admin/inventory/purchase-orders');
    return { ok: true, data: { poId: po.id, poNumber: po.po_number } };
  } catch (err) {
    if (err instanceof InventoryError)
      return { ok: false, error: err.message, code: err.code };
    console.error('[createPurchaseOrderAction]', err);
    return { ok: false, error: 'Unexpected error creating purchase order' };
  }
}

// ── receivePurchaseOrderAction ────────────────────────────────────────────────

export async function receivePurchaseOrderAction(
  payload: ReceivePoPayload
): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!admin) return UNAUTHORIZED;

    if (!payload.po_id) {
      return { ok: false, error: 'po_id is required', code: 'VALIDATION' };
    }
    if (!Array.isArray(payload.receipts) || payload.receipts.length === 0) {
      return { ok: false, error: 'receipts array must not be empty', code: 'VALIDATION' };
    }

    await InventoryService.receivePurchaseOrder(payload, admin.userId);
    revalidatePath('/admin/inventory/purchase-orders');
    revalidatePath('/admin/inventory');
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof InventoryError)
      return { ok: false, error: err.message, code: err.code };
    console.error('[receivePurchaseOrderAction]', err);
    return { ok: false, error: 'Unexpected error receiving purchase order' };
  }
}
