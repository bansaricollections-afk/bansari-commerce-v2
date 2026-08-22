import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Protects /admin and every sub-path EXCEPT /admin/login (and /admin/login/*)
const ADMIN_ROUTES     = /^\/admin(?!\/login(?:\/|$))(?:\/|$)/;
const ADMIN_API_ROUTES = /^\/api\/admin/;

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
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://sdk.cashfree.com https://connect.facebook.net",
    "frame-src https://api.razorpay.com https://sdk.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://sdk.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com https://www.facebook.com",
    "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://sandbox.cashfree.com https://api.cashfree.com",
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
  const isAdminApi  = ADMIN_API_ROUTES.test(pathname);

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
