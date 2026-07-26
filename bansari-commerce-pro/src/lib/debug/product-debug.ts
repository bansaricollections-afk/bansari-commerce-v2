/**
 * product-debug.ts
 *
 * Centralised PRODUCT_DEBUG instrumentation.
 *
 * All helpers are strict no-ops at runtime unless the
 * ENABLE_PRODUCT_DEBUG environment variable is set to the
 * string "true".  Setting it to any other value (including
 * absence) produces zero console output and zero overhead
 * beyond a single boolean comparison.
 *
 * Usage
 * -----
 * Server (.env.local / Vercel env):
 *   ENABLE_PRODUCT_DEBUG=true
 *
 * Client (Next.js public env):
 *   NEXT_PUBLIC_ENABLE_PRODUCT_DEBUG=true
 *
 * The module reads both variables so it works in both
 * server-side (Node) and client-side (browser) contexts.
 */

// ---------------------------------------------------------------------------
// Guard — resolves at module-evaluation time, never changes.
// ---------------------------------------------------------------------------

const IS_DEBUG: boolean = (() => {
  // Server-side: process.env is available.
  if (typeof process !== 'undefined' && process.env) {
    if (process.env['ENABLE_PRODUCT_DEBUG'] === 'true') return true;
    if (process.env['NEXT_PUBLIC_ENABLE_PRODUCT_DEBUG'] === 'true') return true;
  }
  return false;
})();

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function dbg(namespace: string, ...args: unknown[]): void {
  if (!IS_DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug(`[PRODUCT_DEBUG][${namespace}]`, ...args);
}

// ---------------------------------------------------------------------------
// Service-layer helpers  (used by product.service.ts)
// ---------------------------------------------------------------------------

/**
 * Log the start of a Supabase query with the filter parameters.
 */
export function logServiceQueryStart(
  fn: string,
  filters: Record<string, unknown>,
): void {
  dbg(fn, 'query-start', filters);
}

/**
 * Log the result of a Supabase query.
 *
 * @param fn      Function name (e.g. 'getFeaturedProducts')
 * @param rows    Raw rows returned by Supabase
 * @param elapsedMs  Wall-clock time of the DB call in milliseconds
 */
export function logServiceQueryResult(
  fn: string,
  rows: unknown[],
  elapsedMs: number,
): void {
  dbg(fn, 'query-result', { count: rows.length, elapsedMs });
  if (IS_DEBUG) {
    dbg(fn, 'rows', rows);
  }
}

/**
 * Log a Supabase error.
 */
export function logServiceError(
  fn: string,
  error: unknown,
): void {
  dbg(fn, 'error', error);
}

// ---------------------------------------------------------------------------
// API route helpers  (used by route.ts handlers)
// ---------------------------------------------------------------------------

/**
 * Log the outgoing API route response summary.
 *
 * @param route     Route path, e.g. '/api/products/featured'
 * @param count     Number of products being returned
 * @param elapsedMs Total handler time in milliseconds
 */
export function logApiRouteResponse(
  route: string,
  count: number,
  elapsedMs: number,
): void {
  dbg('api-route', route, { count, elapsedMs });
}

/**
 * Log an API route error before responding with 500.
 */
export function logApiRouteError(
  route: string,
  error: unknown,
): void {
  dbg('api-route-error', route, error);
}

// ---------------------------------------------------------------------------
// Client-side fetch helpers  (used by FeaturedProducts.tsx)
// ---------------------------------------------------------------------------

/**
 * Log a successful client-side fetch.
 *
 * @param url        The URL that was fetched
 * @param count      Number of products in the sliced result
 * @param elapsedMs  Elapsed time measured with performance.now()
 * @param bytes      Approximate byte size of the JSON payload (-1 if unknown)
 */
export function logClientFetch(
  url: string,
  count: number,
  elapsedMs: number,
  bytes: number,
): void {
  dbg('client-fetch', url, { count, elapsedMs, bytes });
}

/**
 * Log a client-side fetch error.
 */
export function logClientFetchError(
  url: string,
  error: unknown,
): void {
  dbg('client-fetch-error', url, error);
}

// ---------------------------------------------------------------------------
// ProductCard render helper  (used by ProductCard.tsx)
// ---------------------------------------------------------------------------

/**
 * Log a single ProductCard mount.  Called once per card instance
 * via useEffect([]) so it fires only on mount, not on re-renders.
 *
 * @param productId  Numeric product id
 * @param name       Product display name
 * @param imageUrl   Resolved primary image URL
 */
export function logCardRender(
  productId: number,
  name: string,
  imageUrl: string,
): void {
  dbg('card-render', { productId, name, imageUrl });
}

// ---------------------------------------------------------------------------
// Admin save payload helper  (used by ProductManagement.tsx)
// ---------------------------------------------------------------------------

/**
 * Log the API payload that is about to be dispatched from the
 * admin product save flow.  Called immediately before apiFetch
 * inside handleSave, for both create and update operations.
 *
 * @param mode     'create' | 'update'
 * @param payload  The ApiProductPayload object built by toApiPayload()
 * @param productId  Existing product id when mode === 'update'; undefined for create
 */
export function logAdminSavePayload(
  mode: 'create' | 'update',
  payload: unknown,
  productId?: number,
): void {
  dbg('admin-save', { mode, productId, payload });
}
