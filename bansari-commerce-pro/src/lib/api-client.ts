/**
 * api-client.ts
 * -------------
 * One typed way for admin screens to call this app's own JSON APIs.
 *
 * WHY THIS EXISTS
 *
 * Two defects kept recurring across the admin, and both were invisible in
 * normal use:
 *
 * 1. Errors were discarded. Several screens did
 *
 *        r.ok ? r.json() : Promise.reject(r.statusText)
 *
 *    `Response.statusText` is ALWAYS an empty string over HTTP/2, which is
 *    what every Vercel deployment serves. So a real 500 produced
 *    `setError('')` — falsy — and the screen rendered "nothing found" with no
 *    message at all. Others hardcoded a message and threw the server's away.
 *    A route that already returns { code, message } was being silenced by its
 *    own caller, and diagnosing anything meant reading source instead of the
 *    screen.
 *
 * 2. The response envelope varies by route. apiSuccess() SPREADS its argument,
 *    so `apiSuccess({ order })` sends { success, order } while other routes
 *    send { success, data } and a few send a bare array. Consumers hand-wrote
 *    a type per screen, and three of them guessed wrong — the order list, the
 *    order detail page and the customers list all read `.data` from routes
 *    that never sent it, each failing silently.
 *
 * This helper fixes the first outright and makes the second a compile error:
 * the caller states the shape it expects, and TypeScript checks the reads
 * against that declaration rather than against a hopeful hand-written type.
 *
 * The wire format is deliberately NOT changed. Unifying every route on a
 * single envelope would be the tidier fix, but this is a live storefront and
 * every current consumer is correct today — an audit confirmed it. Rewriting
 * both sides of a working contract to cure a dormant problem is the wrong
 * trade; making the contract checkable is not.
 */

/** The error shape apiError() produces, plus the looser `error` some routes use. */
type ApiFailureBody = {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
};

/**
 * Build the most useful message available, in descending order of specificity.
 * `statusText` is never consulted — see the note above.
 */
function describeFailure(body: ApiFailureBody | null, status: number): string {
  if (body?.message) return body.message;
  if (body?.error) return body.error;

  // Status-specific fallbacks, so an empty body still says something true.
  if (status === 401 || status === 403) {
    return 'You are not signed in, or not authorised to view this. Try signing in again.';
  }
  if (status === 404) return 'Not found.';
  if (status >= 500) return `The server failed to handle this request (${status}).`;
  return `Request failed (${status}).`;
}

/**
 * Fetch JSON from an internal API route.
 *
 * Resolves with the parsed body typed as `T`. Rejects with an Error carrying
 * the server's own message for any transport failure, non-2xx response, or
 * `success: false` payload — so a caller only has to `.catch(e => setError(
 * e.message))` and the user sees what actually went wrong.
 */
export async function requestApi<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    // Offline, DNS failure, or the request was blocked. There is no response
    // to read, so this is the one case with no server-supplied detail.
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  // Read the body on BOTH branches: error routes carry their message here, and
  // reading it only on success is exactly how those messages got lost.
  const body = (await response.json().catch(() => null)) as (T & ApiFailureBody) | null;

  if (!response.ok || body?.success === false) {
    throw new Error(describeFailure(body, response.status));
  }

  if (body === null) {
    throw new Error(`The server returned an unreadable response (${response.status}).`);
  }

  return body as T;
}

/**
 * Same contract, for routes that reply with a bare array rather than an
 * envelope (the analytics endpoints do this). Guarantees an array reaches the
 * render path, so a shape change upstream cannot throw
 * "x.map is not a function" mid-render.
 */
export async function requestApiArray<T>(
  input: string,
  init?: RequestInit
): Promise<T[]> {
  const body = await requestApi<T[] | { data?: T[] }>(input, init);
  if (Array.isArray(body)) return body;
  const nested = (body as { data?: T[] }).data;
  return Array.isArray(nested) ? nested : [];
}
