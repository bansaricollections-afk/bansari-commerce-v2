import { createServiceRoleClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Types — fields must exactly match public.products column names
// ---------------------------------------------------------------------------

export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  /** Maps to the `stock` column in public.products (integer). */
  stock: number;
  /** Maps to the `active` column in public.products (boolean). */
  active: boolean;
  images?: unknown[];
  category?: string;
};

export type CartItem = {
  productId: number;
  quantity: number;
};

export type LineItem = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CartValidationResult =
  | { valid: true; lineItems: LineItem[] }
  | { valid: false; errors: string[] };

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------

/**
 * Fetch a single product by id via the service-role client.
 * Returns null when the product does not exist.
 *
 * The SELECT clause matches the exact column names in public.products:
 *   id, name, slug, price, stock, active, images, category
 *
 * NOTE: There is no `stock_quantity`, `is_active`, or `is_deleted` column
 * in the database schema. Those names were the source of P0-1.
 */
export async function getProductById(id: number): Promise<Product | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, stock, active, images, category')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Product | null;
}

// ---------------------------------------------------------------------------
// validateCartItems
// ---------------------------------------------------------------------------

/**
 * Validates a set of cart items against live database state:
 *   - Product must exist
 *   - Product must be active (active = true)
 *   - Requested quantity must be a positive integer ≤ 100
 *   - Requested quantity must not exceed available stock
 *
 * Returns { valid: true, lineItems } with authoritative server prices,
 * or { valid: false, errors: string[] } listing every failure.
 *
 * One DB fetch per product (parallel via Promise.all).
 */
export async function validateCartItems(
  items: CartItem[]
): Promise<CartValidationResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, errors: ['Cart is empty.'] };
  }

  const products = await Promise.all(
    items.map((item) => getProductById(item.productId))
  );

  const errors: string[] = [];
  const lineItems: LineItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const product = products[i];

    if (!product) {
      errors.push(`Product ${item.productId} does not exist.`);
      continue;
    }

    if (!product.active) {
      errors.push(`Product "${product.name}" is currently unavailable.`);
      continue;
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Invalid quantity for "${product.name}".`);
      continue;
    }

    if (item.quantity > 100) {
      errors.push(`Quantity for "${product.name}" exceeds maximum of 100.`);
      continue;
    }

    // Uses `product.stock` — the actual column name in public.products.
    if (product.stock < item.quantity) {
      errors.push(
        `Insufficient stock for "${product.name}": ${product.stock} available, ${item.quantity} requested.`
      );
      continue;
    }

    lineItems.push({
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal: Math.round(product.price * item.quantity * 100) / 100,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, lineItems };
}
