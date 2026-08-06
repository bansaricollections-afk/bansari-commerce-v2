import type { NextConfig } from 'next';

// Supabase project reference — read from env, with safe fallback for build time
const supabaseHostname =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : '*.supabase.co';

const nextConfig: NextConfig = {
  images: {
    // Remote patterns — Supabase Storage only.
    // External stock image domains (Pexels, Unsplash) are intentionally excluded.
    remotePatterns: [
      {
        // Supabase Storage CDN
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Supabase Storage — legacy path without /public
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/**',
      },
      {
        // Supabase project ref catch-all (covers sub-subdomains)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],

    // Device size breakpoints
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Minimise layout shift — modern browsers only
    contentDispositionType: 'inline',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // TypeScript — errors surface at build time
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
