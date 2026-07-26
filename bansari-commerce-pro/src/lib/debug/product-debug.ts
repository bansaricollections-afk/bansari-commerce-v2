/**
 * product-debug.ts
 *
 * Zero-cost debug instrumentation for the product data pipeline.
 *
 * Usage:
 *   Set ENABLE_PRODUCT_DEBUG=true in .env.local (or the Vercel dashboard)
 *   to activate runtime logging. When the variable is absent or set to any
 *   other value, every exported function is a no-op and the module tree-shakes
 *   away in production builds.
 *
 * Contract:
 *   - No side effects when disabled.
 *   - All functions are synchronous except where noted.
 *   - Never throws — all internal errors are silently swallowed so that
 *     debug code can never break the production path.
 */

const ENABLED =
  process.env.ENABLE_PRODUCT_DEBUG === 'true';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function prefix(layer: string): string {
  return `[PRODUCT_DEBUG][${layer}]`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function byteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log the start of a service-layer query.
 *
 * @param fn    - Name of the service function (e.g. 'getFeaturedProducts')
 * @param query - Optional object describing the Supabase filter applied
 */
export function logServiceQueryStart(
  fn: string,
  query?: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  try {
    console.log(
      `${prefix('service')} ${fn} → query start`,
      query ? safeStringify(query) : '(no filter)',
    );
  } catch { /* noop */ }
}

/**
 * Log the result returned by a service-layer query.
 *
 * @param fn      - Name of the service function
 * @param rows    - Raw rows returned from Supabase before mapping
 * @param elapsed - Wall-clock time in ms measured by the caller
 */
export function logServiceQueryResult(
  fn: string,
  rows: unknown[],
  elapsed: number,
): void {
  if (!ENABLED) return;
  try {
    console.log(
      `${prefix('service')} ${fn} → ${rows.length} row(s) in ${elapsed.toFixed(1)} ms` +
      ` | payload ${byteLength(rows)} bytes`,
    );
    if (rows.length > 0) {
      console.log(
        `${prefix('service')} ${fn} → first row keys:`,
        Object.keys(rows[0] as object).join(', '),
      );
    }
  } catch { /* noop */ }
}

/**
 * Log a service-layer error.
 *
 * @param fn  - Name of the service function
 * @param err - The thrown value
 */
export function logServiceError(fn: string, err: unknown): void {
  if (!ENABLED) return;
  try {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${prefix('service')} ${fn} → ERROR: ${message}`);
  } catch { /* noop */ }
}

/**
 * Log an API route response before it is sent to the client.
 *
 * @param route   - Route path (e.g. '/api/products/featured')
 * @param count   - Number of products included in the response
 * @param elapsed - Wall-clock time in ms from route entry to response
 */
export function logApiRouteResponse(
  route: string,
  count: number,
  elapsed: number,
): void {
  if (!ENABLED) return;
  try {
    console.log(
      `${prefix('route')} ${route} → ${count} product(s) in ${elapsed.toFixed(1)} ms`,
    );
  } catch { /* noop */ }
}

/**
 * Log an API route error before the 500 response is sent.
 *
 * @param route - Route path
 * @param err   - The caught error
 */
export function logApiRouteError(route: string, err: unknown): void {
  if (!ENABLED) return;
  try {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${prefix('route')} ${route} → ERROR: ${message}`);
  } catch { /* noop */ }
}

/**
 * Log a client-side fetch result inside FeaturedProducts.
 *
 * @param url     - The fetch URL
 * @param count   - Number of products received after slicing
 * @param elapsed - Wall-clock time in ms from fetch start to state update
 * @param bytes   - Approximate response byte length (-1 if unavailable)
 */
export function logClientFetch(
  url: string,
  count: number,
  elapsed: number,
  bytes: number,
): void {
  if (!ENABLED) return;
  try {
    console.log(
      `${prefix('client')} fetch ${url} → ${count} item(s) in ${elapsed.toFixed(1)} ms` +
      (bytes >= 0 ? ` | ~${bytes} bytes` : ''),
    );
  } catch { /* noop */ }
}

/**
 * Log a client-side fetch error inside FeaturedProducts.
 *
 * @param url - The fetch URL
 * @param err - The caught error
 */
export function logClientFetchError(url: string, err: unknown): void {
  if (!ENABLED) return;
  try {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${prefix('client')} fetch ${url} → ERROR: ${message}`);
  } catch { /* noop */ }
}

/**
 * Log a ProductCard render event.
 *
 * @param productId   - Numeric product id
 * @param productName - Product display name
 * @param imageUrl    - Resolved primary image URL (or placeholder)
 */
export function logCardRender(
  productId: number,
  productName: string,
  imageUrl: string,
): void {
  if (!ENABLED) return;
  try {
    const isPlaceholder = imageUrl === '/placeholder.png';
    console.log(
      `${prefix('card')} id=${productId} "${productName}"` +
      ` | image=${isPlaceholder ? '⚠ placeholder' : imageUrl}`,
    );
  } catch { /* noop */ }
}

/**
 * Log the admin save payload inside ProductManagement before it is sent
 * to the API.
 *
 * @param mode    - 'create' or 'update'
 * @param id      - Product id when updating (undefined when creating)
 * @param payload - The serialisable API payload object
 */
export function logAdminSavePayload(
  mode: 'create' | 'update',
  id: number | undefined,
  payload: unknown,
): void {
  if (!ENABLED) return;
  try {
    const label = mode === 'update' ? `update id=${id}` : 'create';
    console.log(
      `${prefix('admin')} save → ${label} | payload ${byteLength(payload)} bytes`,
    );
    console.log(`${prefix('admin')} payload:`, safeStringify(payload));
  } catch { /* noop */ }
}
