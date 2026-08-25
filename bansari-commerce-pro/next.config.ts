import type { NextConfig } from 'next';
import crypto from 'crypto';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  // Force a unique build ID on every deploy so Turbopack never reuses
  // stale cached chunks from a previous build (e.g. old column references).
  generateBuildId: async () => {
    return crypto.randomBytes(8).toString('hex');
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    contentDispositionType: 'inline',
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval is required by Next.js/Turbopack in development mode
              // for React call-stack reconstruction and HMR. It is intentionally
              // omitted in production builds via the isDev guard.
              // connect.facebook.net serves fbevents.js for the Meta Pixel.
              // Exact origin, no wildcard.
              //
              // This comment previously asserted that Meta needs no frame-src
              // because that is "only required for Facebook Login and Social
              // Plugins". That is wrong, and it cost real conversions: the
              // pixel also uses an iframe and a form POST as its transport for
              // events too large to send as an image beacon, which is every
              // commerce event. frame-src and form-action below now list
              // www.facebook.com for that reason.
              // sdk.cashfree.com serves the v3 Cashfree checkout SDK. Exact
              // origin, no wildcard. The frame-src origin for the checkout
              // `_modal` iframe is not yet added — it is to be confirmed from
              // the preview console (Cashfree docs do not pin it) before the
              // modal can render.
              // www.googletagmanager.com serves gtag.js for GA4 and Google Ads.
              // Exact origin, no wildcard — this is gtag.js loaded directly,
              // NOT Google Tag Manager, which would need a far looser policy
              // to run container-injected tags. See src/analytics/google-tag.tsx.
              //
              // googleads.g.doubleclick.net and googleadservices.com are loaded
              // as SCRIPTS by the Ads conversion tag (/pagead/viewthrough-
              // conversion). Verified against a live tag: without them the
              // conversion is blocked and Ads records nothing, while GA4 keeps
              // working — a failure that is invisible unless you read the CSP
              // console.
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://connect.facebook.net https://sdk.cashfree.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com"
                : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com https://connect.facebook.net https://sdk.cashfree.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Supabase, Razorpay and WhatsApp API calls.
              // www.facebook.com receives Meta Pixel events via fetch/XHR to /tr.
              // GA4 beacons go to *.google-analytics.com (region-sharded, so a
              // wildcard is unavoidable) and *.analytics.google.com; gtag also
              // POSTs back to googletagmanager.com.
              //
              // The Google Ads CONVERSION itself is sent to the visitor's local
              // Google ccTLD (/pagead/1p-conversion) and to the DoubleClick
              // origins — not to google.com. www.google.co.in is listed because
              // this store sells into India; a visitor browsing from another
              // country hits their own ccTLD and their remarketing ping is
              // dropped, which costs audience signal but never the order.
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://wa.me https://www.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://www.google.co.in https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net`,
              // Images: Supabase storage + Unsplash + Pexels + Shopify CDN.
              // www.facebook.com is the Meta Pixel image-beacon fallback (/tr).
              // google-analytics.com and the Google Ads/DoubleClick origins are
              // the equivalent image-beacon fallbacks for gtag when fetch is
              // unavailable, and carry the Ads conversion pings.
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://cdn.shopify.com https://www.facebook.com https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com https://www.google.co.in https://googleads.g.doubleclick.net",
              // Razorpay payment iframe
              // www.facebook.com is the Meta PIXEL's iframe transport for large
              // events, not Facebook Login. Kept in sync with src/proxy.ts,
              // which overwrites this header in production.
              "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.facebook.com",
              "object-src 'none'",
              "base-uri 'self'",
              // www.facebook.com: the pixel's form-POST transport for large
              // events. Must accompany the frame-src entry above.
              "form-action 'self' https://www.facebook.com",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      {
        // Cache static assets aggressively — fixed: removed stray spaces in regex
        source: '/(.*)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Redirect bare /admin to dashboard
      // (handled by page.tsx but belt-and-suspenders)
    ];
  },
};

export default nextConfig;
