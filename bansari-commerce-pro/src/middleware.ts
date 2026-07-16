import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_ROUTES = /^\/admin(?!\/login)/;
const ADMIN_API_ROUTES = /^\/api\/admin/;

// ---------------------------------------------------------------------------
// Security headers applied to EVERY response.
// ---------------------------------------------------------------------------
//
// CSP is scoped to minimum required origins:
//   - Scripts:  self + inline (Next.js hydration) + Razorpay checkout script
//   - Frames:   Razorpay payment iframe
//   - Connect:  self + Supabase (PostgREST, Auth, Storage) + Razorpay API
//   - Images:   self + data URIs + blob: + Supabase Storage CDN
//   - Styles:   self + inline (Tailwind CSS-in-JS)
//   - Fonts:    self
//   - Objects:  none (no Flash / plugin content)
//   - Base URI: self (prevent base-tag injection)
//   - Form:     self (prevent open redirects via form action)
//
// 'unsafe-inline' for script-src is required by Next.js hydration.
// Remove it only once you have a nonce-based CSP implementation.
//
const SECURITY_HEADERS: Record<string, string> = {
  // Force HTTPS for 2 years; include subdomains; submit to preload list.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Prevent MIME-type sniffing attacks.
  'X-Content-Type-Options': 'nosniff',

  // Prevent this page from being embedded in an iframe (clickjacking).
  'X-Frame-Options': 'DENY',

  // Disable legacy XSS filter (modern CSP is the correct mechanism).
  'X-XSS-Protection': '0',

  // Only send origin in Referer header for cross-origin requests.
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Disable browser features not required by this application.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

  // Content Security Policy.
  'Content-Security-Policy': [
    "default-src 'self'",
    // Next.js requires 'unsafe-inline' for inline scripts during hydration.
    // Razorpay checkout.js must be loaded from their CDN.
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    // Razorpay payment modal renders inside an iframe from api.razorpay.com.
    "frame-src https://api.razorpay.com",
    // API calls to Supabase (auth, database, storage) and Razorpay.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com",
    // Images: own assets, inline SVGs (data:), blobs, Supabase Storage CDN.
    "img-src 'self' data: blob: https://*.supabase.co",
    // Tailwind and any inline <style> tags.
    "style-src 'self' 'unsafe-inline'",
    // Web fonts served from own domain only.
    "font-src 'self'",
    // No plugin content (Flash etc.).
    "object-src 'none'",
    // Prevent base-tag injection attacks.
    "base-uri 'self'",
    // Only allow form submissions to own origin.
    "form-action 'self'",
  ].join('; '),
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = ADMIN_ROUTES.test(pathname);
  const isAdminApi  = ADMIN_API_ROUTES.test(pathname);

  // Build the base response first so we can attach headers.
  let response: NextResponse;

  if (!isAdminPage && !isAdminApi) {
    response = NextResponse.next();
    // Apply security headers to all non-admin routes and return immediately.
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Admin API responses must never be cached.
  if (isAdminApi) {
    response.headers.set('Cache-Control', 'no-store');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT against the Supabase Auth server.
  // Unlike getSession() it never trusts client-supplied cookie data alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isAdminApi) {
      const errResponse = new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => errResponse.headers.set(k, v));
      return errResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => redirectResponse.headers.set(k, v));
    return redirectResponse;
  }

  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    if (isAdminApi) {
      const errResponse = new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => errResponse.headers.set(k, v));
      return errResponse;
    }
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.searchParams.set('error', 'forbidden');
    const redirectResponse = NextResponse.redirect(homeUrl);
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => redirectResponse.headers.set(k, v));
    return redirectResponse;
  }

  // Authenticated admin — attach security headers to the pass-through response.
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
