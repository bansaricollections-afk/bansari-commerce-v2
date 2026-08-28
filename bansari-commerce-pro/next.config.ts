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
    /*
     * IMAGE OPTIMISATION BUDGET
     *
     * The Vercel free tier allows 5,000 image transformations a month, and
     * this project exhausted them — at which point further transformations
     * ERROR, i.e. product images break on a live storefront.
     *
     * Three things were driving it:
     *
     * 1. minimumCacheTTL defaulted to 4 HOURS, so every optimised variant was
     *    re-transformed six times a day forever. With ~240 source images that
     *    is tens of thousands of transformations a month on its own, and it
     *    is by far the largest contributor. 31 days is the value Next's own
     *    docs suggest for reducing cost.
     *
     * 2. deviceSizes listed nine widths up to 3840. No page here needs a 4K
     *    product photo — the widest content container is 1360px — and every
     *    extra width is another billable transformation per image. Trimmed to
     *    four that actually correspond to this layout: small phone, large
     *    phone/2x, desktop, and 1920 for large or retina screens.
     *
     * 3. Neither `formats` nor `qualities` was pinned. Each additional format
     *    or quality multiplies the variants generated per image.
     *
     * Not addressed here because it is a content problem rather than a config
     * one: the source images are enormous — 1MB, 2.4MB and 4.9MB PNGs were
     * measured in production. Optimisation was masking that. Re-exporting the
     * catalogue as compressed JPEG/WebP would cut both this bill and Supabase
     * egress, and is the real fix.
     */
    /*
     * ─────────────────────────────────────────────────────────────────────
     * EMERGENCY: image optimisation is BYPASSED.
     * ─────────────────────────────────────────────────────────────────────
     *
     * The Vercel transformation quota is fully exhausted. Every uncached
     * variant returns 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, verified
     * across four product images at every configured width — only a single
     * variant that happened to be cached still returned 200. The practical
     * effect was broken product images across the storefront.
     *
     * `unoptimized` makes next/image emit a plain <img> pointing at the
     * original file, so nothing touches the optimiser and images render
     * again. It is a deliberate trade, not a fix: the source files are
     * 1-5MB each, so pages are now considerably heavier and Supabase egress
     * rises accordingly. Working and slow beats broken.
     *
     * TO REVERT — once the quota resets (monthly) or the plan is upgraded:
     * delete the `unoptimized` line below. Everything else here is already
     * tuned for that state and needs no other change.
     *
     * The settings that follow are intentionally kept even though they are
     * inert while unoptimized is on, so re-enabling is a one-line change:
     *
     *   minimumCacheTTL  the real cause of the burn. The 4 hour default was
     *                    re-transforming every variant six times a day
     *                    forever; 31 days should keep usage inside the free
     *                    allowance next cycle.
     *   deviceSizes /    left at their ORIGINAL values on purpose. Narrowing
     *   imageSizes       them is a cache invalidation, not a saving: the
     *                    width set decides which URLs the HTML requests, and
     *                    every cached variant is keyed by width. Narrowing
     *                    them while the quota was spent is what turned a
     *                    partial outage into a general one.
     *
     * The durable fix is neither of these: the catalogue should be exported
     * at web weight (~300KB JPEG/WebP) rather than 1-5MB PNGs. At that size
     * unoptimized serving is entirely reasonable and this whole problem
     * disappears.
     */
    unoptimized: true,
    minimumCacheTTL: 2678400, // 31 days
    /*
     * REVERTED to the original width lists — do not narrow these again while
     * the transformation quota is exhausted.
     *
     * Narrowing them looked like a pure saving, but the width set determines
     * the URLs the HTML requests, and every already-cached variant is keyed by
     * width. Dropping 375/750/1200/2048/3840 and the small imageSizes moved
     * EVERY image on the site onto variants that had never been generated —
     * and with the quota spent, Vercel answers those with
     * 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED. The result was broken
     * images across the storefront, including product thumbnails, which had
     * been serving fine from the w=64 cache.
     *
     * The lesson: changing the width set silently invalidates the entire warm
     * cache. It is safe to do only when there is quota available to refill it.
     *
     * The other options here are safe by comparison, because none of them
     * changes the requested URL:
     *   - minimumCacheTTL only extends how long an existing entry lives.
     *   - qualities [75] matches the default the URLs already used.
     *   - formats webp matches the Next default.
     */
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75],
    // One format, not two. Serving both AVIF and WebP doubles the
    // transformations for every image to save a few KB per request.
    formats: ['image/webp'],
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
              // A CSP wildcard `*.example.com` matches SUBDOMAINS ONLY, never
              // the bare apex — gtag.js sometimes posts straight to the apex
              // analytics.google.com, which the wildcard alone does not cover
              // (confirmed blocked live). stats.g.doubleclick.net/g/collect is
              // GA4/Ads cross-domain measurement's own fallback and was
              // missing outright, also confirmed blocked live. Kept in sync
              // with src/proxy.ts, which overwrites this header in production.
              //
              // The Google Ads CONVERSION itself is sent to the visitor's local
              // Google ccTLD (/pagead/1p-conversion) and to the DoubleClick
              // origins — not to google.com. www.google.co.in is listed because
              // this store sells into India; a visitor browsing from another
              // country hits their own ccTLD and their remarketing ping is
              // dropped, which costs audience signal but never the order.
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://wa.me https://www.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://google-analytics.com https://*.analytics.google.com https://analytics.google.com https://www.google.com https://www.google.co.in https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://stats.g.doubleclick.net`,
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
