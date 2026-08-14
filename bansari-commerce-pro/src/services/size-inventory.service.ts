/**
 * size-inventory.service — the single authority for size-level availability.
 *
 * Inventory lives on product_variants (stock, reserved_stock) at
 * (product, size) granularity. Availability is always derived, never stored:
 *
 *     available = stock - reserved_stock        (clamped at 0)
 *
 * Nothing else in the app may compute availability or status. PDP, product
 * card, cart validation, checkout and admin all read the values produced here.
 *
 * ACTIVATION SEMANTIC: a product is size-managed only once it has at least one
 * live variant. Products with no variants return an empty array and every
 * caller falls back to the legacy product-level path unchanged.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { SizeAvailability, SizeSemantic, SizeStatus } from '@/types/product';

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export type { SizeAvailability, SizeSemantic, SizeStatus };

/**
 * Low-stock threshold. NOT a new business rule — this is the value the
 * storefront already used (ProductCard / ProductGallery / ProductInfo all
 * hardcoded `<= 5`), now applied per size instead of per product.
 */
export const LOW_STOCK_THRESHOLD = 5;

export function deriveStatus(available: number): SizeStatus {
  if (available <= 0) return 'SOLD_OUT';
  if (available === 1) return 'ONLY_ONE_LEFT';
  if (available <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'AVAILABLE';
}

type AvailabilityRow = {
  product_id: number;
  variant_id: number;
  sku: string | null;
  size_id: number;
  size_label: string;
  sort_order: number | null;
  size_semantic: string | null;
  size_active: boolean | null;
  status: string;
  stock: number;
  reserved_stock: number;
  available: number;
};

function toSizeAvailability(row: AvailabilityRow): SizeAvailability {
  const available = Math.max(0, row.available ?? 0);
  return {
    variantId: row.variant_id,
    sizeId: row.size_id,
    label: row.size_label,
    sortOrder: row.sort_order ?? 0,
    semantic: (row.size_semantic as SizeSemantic) ?? 'UNCLASSIFIED',
    sku: row.sku ?? '',
    available,
    status: deriveStatus(available),
  };
}

// ---------------------------------------------------------------------------
// Storefront reads
// ---------------------------------------------------------------------------

/**
 * Size availability for many products in ONE query — the product grid must
 * never issue a query per product or per size.
 */
export async function getSizeAvailabilityMap(
  productIds: number[]
): Promise<Map<number, SizeAvailability[]>> {
  const map = new Map<number, SizeAvailability[]>();
  const ids = [...new Set(productIds.filter((id) => Number.isFinite(id)))];
  if (ids.length === 0) return map;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('v_product_size_availability')
    .select('*')
    .in('product_id', ids)
    .eq('status', 'active')
    .eq('size_active', true);

  if (error) {
    // Availability must never take the storefront down: fall back to the
    // legacy product-level path by returning no size data.
    return map;
  }

  for (const row of (data ?? []) as AvailabilityRow[]) {
    const list = map.get(row.product_id) ?? [];
    list.push(toSizeAvailability(row));
    map.set(row.product_id, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  return map;
}

export async function getSizeAvailabilityForProduct(
  productId: number
): Promise<SizeAvailability[]> {
  const map = await getSizeAvailabilityMap([productId]);
  return map.get(productId) ?? [];
}

/**
 * Live availability for one variant, read at validation time.
 * Returns null when the variant does not exist / is not sellable.
 */
export async function getVariantAvailability(
  variantId: number
): Promise<{ productId: number; label: string; available: number; status: SizeStatus } | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('v_product_size_availability')
    .select('*')
    .eq('variant_id', variantId)
    .eq('status', 'active')
    .eq('size_active', true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as AvailabilityRow;
  const available = Math.max(0, row.available ?? 0);
  return {
    productId: row.product_id,
    label: row.size_label,
    available,
    status: deriveStatus(available),
  };
}

// ---------------------------------------------------------------------------
// Catalogue-level availability (shop filters + facets)
// ---------------------------------------------------------------------------

/**
 * Which products are size-managed, and which of those are actually sellable.
 *
 * A product is size-managed the moment it has one live variant. Its
 * sellability is then decided ONLY by variant availability — `products.stock`
 * and `products.sizes[]` are never consulted for it. Products absent from
 * `sizeManagedIds` keep the legacy product-level path.
 *
 * `sizeManagedIds` is the set to exclude from legacy matching; `sellableIds`
 * is the subset with at least one size that has `available > 0`.
 */
export async function getVariantAvailabilityIndex(): Promise<{
  sizeManagedIds: Set<number>;
  sellableIds: Set<number>;
  /** size label (upper-cased) → product ids with available > 0 for that size */
  sellableIdsBySize: Map<string, Set<number>>;
  /** size label (upper-cased) → every size-managed product offering that size */
  offeredIdsBySize: Map<string, Set<number>>;
  /** size labels that have at least one product with available > 0 */
  sellableSizeLabels: Set<string>;
}> {
  const sizeManagedIds = new Set<number>();
  const sellableIds = new Set<number>();
  const sellableIdsBySize = new Map<string, Set<number>>();
  const offeredIdsBySize = new Map<string, Set<number>>();
  const sellableSizeLabels = new Set<string>();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('v_product_size_availability')
    .select('product_id, size_label, available, status, size_active')
    .eq('status', 'active')
    .eq('size_active', true);

  if (error) {
    // Availability must never take the shop down. With no index, callers fall
    // back to the legacy path for every product — the pre-size-inventory
    // behaviour, which is safe if imprecise.
    return {
      sizeManagedIds, sellableIds, sellableIdsBySize, offeredIdsBySize, sellableSizeLabels,
    };
  }

  for (const row of (data ?? []) as AvailabilityRow[]) {
    const productId = row.product_id;
    sizeManagedIds.add(productId);

    const label = (row.size_label ?? '').trim().toUpperCase();
    if (label) {
      const offered = offeredIdsBySize.get(label) ?? new Set<number>();
      offered.add(productId);
      offeredIdsBySize.set(label, offered);
    }

    if ((row.available ?? 0) > 0) {
      sellableIds.add(productId);

      if (label) {
        sellableSizeLabels.add(label);
        const set = sellableIdsBySize.get(label) ?? new Set<number>();
        set.add(productId);
        sellableIdsBySize.set(label, set);
      }
    }
  }

  return {
    sizeManagedIds, sellableIds, sellableIdsBySize, offeredIdsBySize, sellableSizeLabels,
  };
}

/**
 * Live availability for a set of variants, in one query.
 * Used to cap cart quantities against current stock.
 */
export async function getAvailabilityForVariants(
  variantIds: number[]
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const ids = [...new Set(variantIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) return result;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('v_product_size_availability')
    .select('variant_id, available, status, size_active')
    .in('variant_id', ids);

  if (error) return result;

  for (const row of (data ?? []) as AvailabilityRow[]) {
    const sellable = row.status === 'active' && row.size_active !== false;
    result.set(row.variant_id, sellable ? Math.max(0, row.available ?? 0) : 0);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Admin reads / writes
// ---------------------------------------------------------------------------

export type AdminSizeRow = {
  sizeId: number;
  label: string;
  sortOrder: number;
  semantic: SizeSemantic;
  /** null when this size has no variant yet — i.e. the size is not offered. */
  variantId: number | null;
  sku: string | null;
  stock: number | null;
  reserved: number;
  available: number;
  status: SizeStatus | null;
  variantStatus: string | null;
};

export type AdminProductInventory = {
  productId: number;
  productName: string;
  productSku: string | null;
  legacyProductStock: number | null;
  legacyProductSizes: string[];
  sizeManaged: boolean;
  rows: AdminSizeRow[];
};

/**
 * One row per active size in size_master, joined with this product's variant
 * (when it exists). This is what the admin inventory screen renders.
 */
export async function getAdminProductInventory(
  productId: number
): Promise<AdminProductInventory | null> {
  const supabase = createServiceRoleClient();

  const [{ data: product, error: productErr }, { data: sizes }, { data: variants }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id, name, sku, stock, sizes')
        .eq('id', productId)
        .maybeSingle(),
      supabase
        .from('size_master')
        .select('id, label, sort_order, size_semantic')
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_variants')
        .select('id, size_id, sku, stock, reserved_stock, status')
        .eq('product_id', productId)
        .is('deleted_at', null),
    ]);

  if (productErr || !product) return null;

  const variantBySize = new Map<number, NonNullable<typeof variants>[number]>();
  for (const v of variants ?? []) {
    if (v.size_id != null) variantBySize.set(v.size_id, v);
  }

  const rows: AdminSizeRow[] = (sizes ?? []).map((s) => {
    const v = variantBySize.get(s.id);
    const stock = v?.stock ?? null;
    const reserved = v?.reserved_stock ?? 0;
    const available = v ? Math.max(0, (v.stock ?? 0) - reserved) : 0;
    return {
      sizeId: s.id,
      label: s.label,
      sortOrder: s.sort_order ?? 0,
      semantic: ((s as { size_semantic?: string }).size_semantic as SizeSemantic) ?? 'UNCLASSIFIED',
      variantId: v?.id ?? null,
      sku: v?.sku ?? null,
      stock,
      reserved,
      available,
      status: v ? deriveStatus(available) : null,
      variantStatus: v?.status ?? null,
    };
  });

  const rawSizes = (product as { sizes?: unknown }).sizes;
  const legacyProductSizes = Array.isArray(rawSizes)
    ? (rawSizes as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    productId: product.id as number,
    productName: (product.name as string) ?? '',
    productSku: (product.sku as string | null) ?? null,
    legacyProductStock: (product.stock as number | null) ?? null,
    legacyProductSizes,
    sizeManaged: rows.some((r) => r.variantId !== null && r.variantStatus === 'active'),
    rows,
  };
}

export type SizeStockInput = {
  sizeId: number;
  /** null / '' → size not offered. An existing variant is deactivated, never deleted. */
  stock: number | null;
};

export type SaveInventoryResult =
  | { ok: true; created: number; updated: number; deactivated: number }
  | { ok: false; error: string };

/**
 * Creates missing variants, updates stock through the audited RPC, and
 * deactivates sizes that were cleared. Historical order_items keep pointing at
 * the variant row, so nothing is ever hard-deleted.
 */
export async function saveProductSizeInventory(
  productId: number,
  input: SizeStockInput[],
  actor?: { id?: string | null; name?: string | null }
): Promise<SaveInventoryResult> {
  const supabase = createServiceRoleClient();

  const { data: product, error: productErr } = await supabase
    .from('products')
    .select('id, sku, price, compare_price')
    .eq('id', productId)
    .maybeSingle();

  if (productErr || !product) return { ok: false, error: 'Product not found.' };

  const { data: sizes } = await supabase
    .from('size_master')
    .select('id, label')
    .eq('active', true);

  const labelBySize = new Map<number, string>(
    (sizes ?? []).map((s) => [s.id as number, s.label as string])
  );

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, size_id, status, stock, reserved_stock')
    .eq('product_id', productId)
    .is('deleted_at', null);

  const variantBySize = new Map<number, NonNullable<typeof variants>[number]>();
  for (const v of variants ?? []) {
    if (v.size_id != null) variantBySize.set(v.size_id, v);
  }

  const price = Number(product.price ?? 0);
  const comparePrice = Number((product as { compare_price?: number | null }).compare_price ?? 0);
  const mrp = Math.max(price, comparePrice);
  const skuBase = (product.sku as string | null)?.trim() || `BC-${productId}`;

  let created = 0;
  let updated = 0;
  let deactivated = 0;

  for (const row of input) {
    const existing = variantBySize.get(row.sizeId);
    const label = labelBySize.get(row.sizeId);
    if (!label) continue;

    // Cleared field → stop offering this size, but keep the row for history.
    if (row.stock === null) {
      if (existing && existing.status === 'active') {
        const { error } = await supabase
          .from('product_variants')
          .update({ status: 'inactive' })
          .eq('id', existing.id);
        if (error) return { ok: false, error: `Could not deactivate size ${label}: ${error.message}` };
        deactivated += 1;
      }
      continue;
    }

    if (!Number.isInteger(row.stock) || row.stock < 0) {
      return { ok: false, error: `Stock for size ${label} must be a whole number of 0 or more.` };
    }

    let variantId = existing?.id ?? null;

    if (!variantId) {
      const { data: inserted, error } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          size_id: row.sizeId,
          size_label: label,
          sku: `${skuBase}-${label}`.toUpperCase(),
          mrp,
          price,
          selling_price: price,
          stock: 0,
          reserved_stock: 0,
          status: 'active',
        })
        .select('id')
        .single();

      if (error || !inserted) {
        return { ok: false, error: `Could not create size ${label}: ${error?.message ?? 'unknown error'}` };
      }
      variantId = inserted.id as number;
      created += 1;
    } else if (existing && existing.status !== 'active') {
      const { error } = await supabase
        .from('product_variants')
        .update({ status: 'active' })
        .eq('id', variantId);
      if (error) return { ok: false, error: `Could not reactivate size ${label}: ${error.message}` };
    }

    const { error: stockErr } = await supabase.rpc('set_variant_stock', {
      p_variant_id: variantId,
      p_stock: row.stock,
      p_actor_id: actor?.id ?? null,
      p_actor_name: actor?.name ?? null,
    });

    if (stockErr) {
      return { ok: false, error: `Could not set stock for size ${label}: ${stockErr.message}` };
    }
    updated += 1;
  }

  return { ok: true, created, updated, deactivated };
}

/** Size semantic is global metadata on size_master — never per product. */
export async function setSizeSemantic(
  sizeId: number,
  semantic: SizeSemantic
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed: SizeSemantic[] = ['REGULAR', 'PLUS', 'FREE_SIZE', 'UNCLASSIFIED'];
  if (!allowed.includes(semantic)) return { ok: false, error: 'Invalid size semantic.' };

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('size_master')
    .update({ size_semantic: semantic })
    .eq('id', sizeId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
