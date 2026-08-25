import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Protects /admin and every sub-path EXCEPT /admin/login (and /admin/login/*)
/*
 * SEC-01. src/app/(admin)/inventory/* sits in a Next.js ROUTE GROUP, so
 * "(admin)" never appears in the URL — those pages serve at /inventory/...,
 * which /^\/admin/ does not match. They had no in-page guard and no group
 * layout either, so /inventory/adjustments/new answered 200 to anonymous
 * callers while /admin/orders correctly redirected to login.
 *
 * Only the admin UI shell leaked (no data: the mutation APIs live under
 * /api/admin/v2/fulfillment and were already gated), but an unauthenticated
 * admin surface should not be reachable at all.
 *
 * /api/inventory/availability is unaffected — it starts with /api/ and is
 * matched by the API patterns below, not this one.
 */
const ADMIN_ROUTES     = /^\/(?:admin(?!\/login(?:\/|$))|inventory)(?:\/|$)/;
const ADMIN_API_ROUTES = /^\/api\/admin/;

/*
 * SEC-07 (P1). The DAM / asset / collection APIs live outside /api/admin, so
 * this middleware never applied its role check to them, and each route gated
 * only on `if (!user) 401` — no role check anywhere. Any authenticated account
 * could therefore create, modify, delete and APPROVE assets, alter rights
 * records, trigger processing and delete collections.
 *
 * That was latent while admins were the only accounts. Adding self-service
 * customer signup made it reachable by any customer, turning a dormant flaw
 * into a live privilege-escalation path.
 *
 * Routing them through the same gate as /api/admin gives the required
 * semantics — 401 unauthenticated, 403 authenticated non-admin — from one
 * place, using app_metadata.role, which is server-set and not client-editable.
 *
 * Safe to lock down: none of these are reachable anonymously today (all
 * already answered 401), so no public storefront path depends on them.
 */
const PRIVILEGED_API_ROUTES =
  /^\/api\/(assets|dam|rights|processing|media|collections)(?:\/|$)/;

const IS_DEV = process.env.NODE_ENV === 'development';

// Full security headers applied in production only.
// In development, next.config.ts owns the CSP (it adds 'unsafe-eval' for
// Turbopack/HMR). Applying this CSP on top would overwrite that header and
// strip 'unsafe-eval', breaking the dev runtime with a CSP eval violation.
const PROD_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':           'DENY',
  'X-XSS-Protection':          '0',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    // connect.facebook.net serves fbevents.js; www.facebook.com receives the
    // pixel's events via fetch to /tr, with an image beacon as fallback. All
    // three were already declared in next.config.ts, which this header
    // overrides — so the pixel initialised but every request it made was
    // blocked. Confirmed live: the page requested fbevents.js and CSP refused.
    // Google: www.googletagmanager.com serves gtag.js (GA4 + Google Ads).
    // googleads.g.doubleclick.net and googleadservices.com are loaded as
    // SCRIPTS by the Ads conversion tag, not merely as image beacons.
    //
    // These MUST be kept in sync with next.config.ts. This header overwrites
    // that one in production, so an origin present only there is allowed in
    // development and blocked in production — which is exactly how gtag.js
    // shipped blocked while local testing passed. The same trap is documented
    // above for the Meta pixel; it is the single easiest mistake to make in
    // this file.
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://sdk.cashfree.com https://connect.facebook.net https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com",
    /*
     * www.facebook.com is required by the PIXEL, not by Facebook Login.
     *
     * fbevents.js picks a transport per payload size. Small events (PageView)
     * go out as an image beacon, which img-src already allows. Larger ones —
     * ViewContent, AddToCart, Purchase, which carry content_ids, contents,
     * value and category — exceed what a GET can hold, so the pixel falls back
     * to a hidden FORM POST and an invisible IFRAME.
     *
     * Both were blocked, so exactly the commerce events Meta optimises on were
     * dropped while PageView sailed through. Confirmed from a real browser
     * console: "Framing 'https://www.facebook.com/' violates ... frame-src"
     * and "Sending form data to 'https://www.facebook.com/tr/' violates ...
     * form-action".
     */
    "frame-src https://api.razorpay.com https://sdk.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com https://www.facebook.com",
    // GA4 beacons go to *.google-analytics.com (region-sharded) and
    // *.analytics.google.com. The Google Ads CONVERSION is sent to the
    // visitor's local Google ccTLD (/pagead/1p-conversion) and to the
    // DoubleClick origins — not to google.com. www.google.co.in is listed
    // because this store sells into India.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://sdk.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com https://www.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://www.google.co.in https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net",
    "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com https://www.google.co.in https://googleads.g.doubleclick.net",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // www.facebook.com: the pixel's form-POST transport for large events.
    // See the frame-src note above — these two must be added together, because
    // the pixel tries the form first and the iframe as its next fallback.
    "form-action 'self' https://sandbox.cashfree.com https://api.cashfree.com https://www.facebook.com",
  ].join('; '),
};

function applyHeaders(res: NextResponse): NextResponse {
  // In development, do not apply any security headers from the middleware.
  // next.config.ts already sets the correct dev-compatible CSP with
  // 'unsafe-eval'. Applying PROD_SECURITY_HEADERS here would overwrite it.
  if (IS_DEV) return res;
  Object.entries(PROD_SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * Returns true when the Supabase user holds the admin role.
 * Checks app_metadata ONLY — it is server-set (via the service-role/Admin
 * API) and cannot be edited by the user. user_metadata is client-editable
 * via supabase.auth.updateUser() and MUST NOT be treated as a trusted
 * privilege source.
 */
function isAdmin(user: {
  app_metadata?: Record<string, unknown>;
}): boolean {
  return user.app_metadata?.role === 'admin';
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const isAdminPage = ADMIN_ROUTES.test(pathname);
  const isAdminApi  = ADMIN_API_ROUTES.test(pathname) || PRIVILEGED_API_ROUTES.test(pathname);

  // ── Non-admin routes ─────────────────────────────────────────────────────────
  if (!isAdminPage && !isAdminApi) {
    return applyHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Build a mutable response so Supabase SSR can write refreshed session cookies.
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (isAdminApi) response.headers.set('Cache-Control', 'no-store');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT against the Supabase Auth server — never trusts
  // client-supplied cookie data alone.
  const { data: { user } } = await supabase.auth.getUser();

  // ── Unauthenticated ───────────────────────────────────────────────────────────
  if (!user) {
    if (isAdminApi) {
      return applyHeaders(
        new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return applyHeaders(NextResponse.redirect(url));
  }

  // ── Authenticated but not an admin ──────────────────────────────────────────
  if (!isAdmin(user)) {
    if (isAdminApi) {
      return applyHeaders(
        new NextResponse(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    // Redirect to login with an error flag — NEVER to /?error=forbidden.
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.delete('next');
    url.searchParams.set('error', 'not_admin');
    return applyHeaders(NextResponse.redirect(url));
  }

  // ── Authenticated admin — pass through ───────────────────────────────────────
  return applyHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
