import { createServiceRoleClient } from '@/lib/supabase/service';
import {
  logServiceQueryStart,
  logServiceQueryResult,
  logServiceError,
} from '@/lib/debug/product-debug';
import type { FilterParams, PaginationMeta, SortOption } from '@/types/filter-params';

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
  images?: { url?: string; alt?: string; type?: string }[];
  category?: string;
  /* Additional optional fields from full product schema */
  seo_title?: string;
  seo_description?: string;
  description?: string;
  sku?: string;
  styleCode?: string;
  shortName?: string;
  subCategory?: string;
  collection?: string;
  badge?: string;
  /** Mapped from compare_price (snake_case DB column). */
  oldPrice?: number;
  discount?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  /** Flat sizes array from DB e.g. ["S","M","L"]. */
  sizes?: string[];
  /** Synthesised from sizes[] for ProductVariantSelector. */
  variants?: any[];
  specifications?: any;
  seo?: any;
  reviews?: any[];
  color?: string;
  fabric?: string;
};

export type CartItem = {
  productId: number;
  quantity: number;
};

export type LineItem = {
  productId: number;
  productName: string;
  productSlug: string;
  productSku: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CartValidationResult =
  | { valid: true; lineItems: LineItem[] }
  | { valid: false; errors: string[] };

// ---------------------------------------------------------------------------
// Shared select clause — every field consumed by any storefront component
// ---------------------------------------------------------------------------

const PRODUCT_SELECT =
  'id, name, slug, price, stock, active, images, category, featured, new_arrival, best_seller, description, sizes, compare_price, seo_title, seo_description, sku, collection, fabric, color, rating, review_count, specifications' as const;

// ---------------------------------------------------------------------------
// mapRow — normalises a raw Supabase row into the Product shape
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, any>): Product {
  // Build variants[] from flat sizes[] so ProductVariantSelector receives data
  const rawSizes: unknown = row['sizes'];
  let sizes: string[] = [];
  if (Array.isArray(rawSizes)) {
    sizes = rawSizes.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  } else if (typeof rawSizes === 'string' && rawSizes.trim().length > 0) {
    sizes = rawSizes.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const variants =
    sizes.length > 0
      ? sizes.map((size) => ({
          id: `${row['id']}-${size}`,
          color: row['color'] ?? '',
          colorCode: '',
          size,
          stock: typeof row['stock'] === 'number' ? row['stock'] : 0,
        }))
      : undefined;

  return {
    id: row['id'],
    name: row['name'],
    slug: row['slug'] ?? '',
    price: row['price'],
    stock: row['stock'] ?? 0,
    active: row['active'] ?? false,
    images: row['images'] ?? [],
    category: row['category'] ?? undefined,
    featured: row['featured'] ?? false,
    newArrival: row['new_arrival'] ?? false,
    bestSeller: row['best_seller'] ?? false,
    description: row['description'] ?? undefined,
    sizes,
    variants,
    sku: row['sku'] ?? undefined,
    collection: row['collection'] ?? undefined,
    fabric: row['fabric'] ?? undefined,
    color: row['color'] ?? undefined,
    rating: row['rating'] ?? undefined,
    reviewCount: row['review_count'] ?? undefined,
    specifications: row['specifications'] ?? undefined,
    seo_title: row['seo_title'] ?? undefined,
    seo_description: row['seo_description'] ?? undefined,
    // compare_price DB column → oldPrice camelCase used by ProductCard / ProductInfo
    oldPrice: row['compare_price'] ?? undefined,
  };
}

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
  return data ? mapRow(data) : null;
}

// ---------------------------------------------------------------------------
// getProducts  ← UNTOUCHED — zero regression on existing callers
// ---------------------------------------------------------------------------

/**
 * Fetch all active products, newest first.
 * Used by ProductGrid (legacy), WishlistPage, and home-page components.
 *
 * DO NOT MODIFY — callers depend on the exact no-argument signature.
 * For filtered/paginated/sorted queries use getFilteredProducts() instead.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

// ---------------------------------------------------------------------------
// getFilteredProducts  ← Sprint 9A: dynamic query builder
// ---------------------------------------------------------------------------

/**
 * Filtered, sorted, and paginated product query.
 *
 * Builds a single Supabase SELECT with all WHERE clauses applied dynamically
 * based on the FilterParams supplied by the caller.  A parallel COUNT query
 * (head:true) returns the total number of matching rows without fetching data.
 *
 * Returns { products, meta } where meta carries full pagination information
 * that Pagination.tsx and ShopToolbar.tsx can render without any additional
 * data fetching.
 *
 * All fields in FilterParams are optional; omitted fields are ignored so the
 * function degrades gracefully to the full active-product list when no filters
 * are provided.
 */
export async function getFilteredProducts(
  params: FilterParams = {}
): Promise<{ products: Product[]; meta: PaginationMeta }> {
  const {
    page = 1,
    perPage = 24,
    sort = 'newest',
    category,
    collection,
    fabric,
    color,
    priceMin,
    priceMax,
    occasion,
    size,
    inStock,
  } = params;

  const safePerPage = Math.min(Math.max(1, perPage), 100); // clamp 1–100
  const safePage    = Math.max(1, page);
  const from        = (safePage - 1) * safePerPage;
  const to          = from + safePerPage - 1;

  const supabase = createServiceRoleClient();

  // ── Build the base query (always filter active products) ──────────────────
  // We use a helper to apply identical filters to both the data query and the
  // count query, so the total count always matches the returned page.

  function applyFilters<T>(q: T): T {
    let query = q as any;
    query = query.eq('active', true);

    if (category)   query = query.eq('category', category);
    if (collection) query = query.eq('collection', collection);
    if (fabric)     query = query.eq('fabric', fabric);
    if (color)      query = query.eq('color', color);

    if (priceMin !== undefined) query = query.gte('price', priceMin);
    if (priceMax !== undefined) query = query.lte('price', priceMax);

    if (inStock === true) query = query.gt('stock', 0);

    // sizes is a text[] column; use Supabase .contains() which maps to @>
    if (size) query = query.contains('sizes', [size]);

    // occasion is stored inside the specifications JSONB column
    // Use Postgres ->> cast and ilike for case-insensitive match
    if (occasion) {
      query = query.ilike('specifications->>occasion', `%${occasion}%`);
    }

    return query as T;
  }

  // ── Apply sort order ──────────────────────────────────────────────────────
  function applySort<T>(q: T, sortOption: SortOption): T {
    let query = q;
    switch (sortOption) {
      case 'newest':
        query = (query as any).order('created_at', { ascending: false });
        break;
      case 'price_asc':
        query = (query as any).order('price', { ascending: true });
        break;
      case 'price_desc':
        query = (query as any).order('price', { ascending: false });
        break;
      case 'bestseller':
        // best_seller flag first, then newest within that group
        query = (query as any)
          .order('best_seller', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'discount':
        // Highest absolute discount first (compare_price - price DESC).
        // Supabase does not support computed ORDER BY expressions via the JS
        // client, so we order by compare_price DESC as the closest proxy —
        // products with a higher compare_price tend to have a larger discount.
        // A proper computed sort requires a DB view or RPC (Sprint 9C candidate).
        query = (query as any)
          .order('compare_price', { ascending: false })
          .order('price', { ascending: true });
        break;
      default:
        query = (query as any).order('created_at', { ascending: false });
    }
    return query as T;
  }

  // ── Parallel: count (head:true = no rows returned) + data ─────────────────
  const countQuery = applyFilters(
    supabase.from('products').select('*', { count: 'exact', head: true })
  );

  const dataQuery = applySort(
    applyFilters(
      supabase.from('products').select(PRODUCT_SELECT)
    ),
    sort
  ).range(from, to);

  const [{ count, error: countError }, { data, error: dataError }] =
    await Promise.all([countQuery, dataQuery]);

  if (countError) throw new Error(countError.message);
  if (dataError)  throw new Error(dataError.message);

  const total      = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));

  return {
    products: (data ?? []).map(mapRow),
    meta: {
      page:        safePage,
      perPage:     safePerPage,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

// ---------------------------------------------------------------------------
// getNewArrivals
// ---------------------------------------------------------------------------

/**
 * Fetch active products where new_arrival = true, newest first.
 * Used by the "New Collection" tab in FeaturedProducts home component
 * (sliced to 4 by the caller).
 */
export async function getNewArrivals(): Promise<Product[]> {
  const supabase = createServiceRoleClient();

  logServiceQueryStart('getNewArrivals', { active: true, new_arrival: true });
  const t0 = Date.now();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('new_arrival', true)
    .order('created_at', { ascending: false });

  if (error) {
    logServiceError('getNewArrivals', error);
    throw new Error(error.message);
  }

  const rows = data ?? [];
  logServiceQueryResult('getNewArrivals', rows, Date.now() - t0);
  return rows.map(mapRow);
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

  logServiceQueryStart('getFeaturedProducts', { active: true, featured: true });
  const t0 = Date.now();

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false });

  if (error) {
    logServiceError('getFeaturedProducts', error);
    throw new Error(error.message);
  }

  const rows = data ?? [];
  logServiceQueryResult('getFeaturedProducts', rows, Date.now() - t0);
  return rows.map(mapRow);
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
  return (data ?? []).map(mapRow);
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
    const item = items[i]!;
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
      productSlug: product.slug,
      productSku: product.sku ?? '',
      productImage: product.images?.[0]?.url ?? '',
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
