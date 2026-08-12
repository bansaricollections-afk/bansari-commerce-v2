'use server';

import { revalidatePath } from 'next/cache';

import { requireAdminAction } from '@/lib/auth/requireAdmin';
import {
  saveProductSizeInventory,
  setSizeSemantic,
  type SizeSemantic,
  type SizeStockInput,
} from '@/services/size-inventory.service';

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const UNAUTHORIZED = { ok: false as const, error: 'Admin authorization required.' };

/**
 * Writes per-size stock for one product. Creates the variant the first time a
 * size receives stock; never deletes, so historical order_items stay valid.
 */
export async function saveSizeInventoryAction(
  productId: number,
  rows: SizeStockInput[]
): Promise<ActionResult<{ created: number; updated: number; deactivated: number }>> {
  const admin = await requireAdminAction();
  if (!admin) return UNAUTHORIZED;

  if (!Number.isInteger(productId) || productId <= 0) {
    return { ok: false, error: 'Invalid product.' };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No sizes submitted.' };
  }

  const result = await saveProductSizeInventory(productId, rows, {
    id: admin.userId,
    name: admin.email,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}/inventory`);
  revalidatePath(`/product/${productId}`);
  revalidatePath('/shop');

  return {
    ok: true,
    data: {
      created: result.created,
      updated: result.updated,
      deactivated: result.deactivated,
    },
  };
}

/** Size semantic is catalogue-wide metadata on size_master, not per product. */
export async function setSizeSemanticAction(
  sizeId: number,
  semantic: SizeSemantic
): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin) return UNAUTHORIZED;

  const result = await setSizeSemantic(sizeId, semantic);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true, data: undefined };
}
