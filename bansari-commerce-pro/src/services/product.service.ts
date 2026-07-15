import { createServiceRoleClient } from '@/lib/supabase/service';

export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_deleted: boolean;
  images?: string[];
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

/**
 * Fetch a single product by id via the service-role client.
 * Returns null when the product does not exist or has been deleted.
 */
export async function getProductById(id: number): Promise<Product | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, stock_quantity, is_active, is_deleted, images, category')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Product | null;
}

/**
 * validateCartItems
 *
 * Validates a set of cart items against live database state:
 *   - Product must exist
 *   - Product must not be deleted
 *   - Product must be active
 *   - Requested quantity must not exceed available stock
 *   - Quantity must be a positive integer ≤ 100
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

    if (product.is_deleted) {
      errors.push(`Product "${product.name}" is no longer available.`);
      continue;
    }

    if (!product.is_active) {
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

    if (product.stock_quantity < item.quantity) {
      errors.push(
        `Insufficient stock for "${product.name}": ${product.stock_quantity} available, ${item.quantity} requested.`
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
