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
// Shared select clause
// ---------------------------------------------------------------------------

const PRODUCT_SELECT = 'id, name, slug, price, stock, active, images, category' as const;

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------

/**
 * Fetch a single product by id via the service-role client.
 * Returns null when the product does not exist.
 */
export async function getProductById(id: number): Promise<Product | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Product | null;
}

// ---------------------------------------------------------------------------
// getProducts
// ---------------------------------------------------------------------------

/**
 * Fetch all active products, newest first.
 * Used by ProductGrid and WishlistPage.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// getFeaturedProducts
// ---------------------------------------------------------------------------

/**
 * Fetch active products where featured = true, newest first.
 * Used by FeaturedProducts home component (sliced to 4 by the caller).
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// getRelatedProducts
// ---------------------------------------------------------------------------

/**
 * Fetch related products in the same category, excluding the current product.
 * Used by CompleteLook — called as getRelatedProducts(id, category, limit).
 *
 * @param productId  — current product to exclude from results
 * @param category   — category to match
 * @param limit      — max number of results (default 4)
 */
export async function getRelatedProducts(
  productId: number,
  category: string,
  limit = 4
): Promise<Product[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('category', category)
    .neq('id', productId)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// validateCartItems
// ---------------------------------------------------------------------------

/**
 * Validates a set of cart items against live database state.
 * Returns { valid: true, lineItems } or { valid: false, errors }.
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
