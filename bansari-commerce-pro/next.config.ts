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
              // Exact origin, no wildcard. Meta needs no frame-src here: that
              // is only required for Facebook Login and Social Plugins, and
              // frame-src below stays scoped to the Razorpay payment iframe.
              // sdk.cashfree.com serves the v3 Cashfree checkout SDK. Exact
              // origin, no wildcard. The frame-src origin for the checkout
              // `_modal` iframe is not yet added — it is to be confirmed from
              // the preview console (Cashfree docs do not pin it) before the
              // modal can render.
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://connect.facebook.net https://sdk.cashfree.com"
                : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com https://connect.facebook.net https://sdk.cashfree.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Supabase, Razorpay and WhatsApp API calls.
              // www.facebook.com receives Meta Pixel events via fetch/XHR to /tr.
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://wa.me https://www.facebook.com`,
              // Images: Supabase storage + Unsplash + Pexels + Shopify CDN.
              // www.facebook.com is the Meta Pixel image-beacon fallback (/tr).
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://cdn.shopify.com https://www.facebook.com",
              // Razorpay payment iframe
              "frame-src https://api.razorpay.com https://checkout.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
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
