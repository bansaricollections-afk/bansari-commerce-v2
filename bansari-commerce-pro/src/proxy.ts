import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Protects /admin and every sub-path EXCEPT /admin/login (and /admin/login/*)
const ADMIN_ROUTES     = /^\/admin(?!\/login(?:\/|$))(?:\/|$)/;
const ADMIN_API_ROUTES = /^\/api\/admin/;

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':           'DENY',
  'X-XSS-Protection':          '0',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "frame-src https://api.razorpay.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

function applyHeaders(res: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * Returns true when the Supabase user holds the admin role.
 * Checks app_metadata first (server-set, canonical for Supabase Auth).
 * Falls back to user_metadata so projects that store role there also work.
 */
function isAdmin(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): boolean {
  return (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = ADMIN_ROUTES.test(pathname);
  const isAdminApi  = ADMIN_API_ROUTES.test(pathname);

  // ── Non-admin routes ────────────────────────────────────────────────────────
  if (!isAdminPage && !isAdminApi) {
    return applyHeaders(NextResponse.next());
  }

  // Build a mutable response so Supabase SSR can write refreshed session cookies.
  const response = NextResponse.next({ request: { headers: request.headers } });
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

  // ── Unauthenticated ─────────────────────────────────────────────────────────
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

  // ── Authenticated admin — pass through ──────────────────────────────────────
  return applyHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
