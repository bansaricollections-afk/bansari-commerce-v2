import { MetadataRoute } from 'next';

/**
 * Auto-generates /robots.txt via Next.js Metadata API.
 * No manual file needed in /public.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bansaricollections.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/checkout/processing',
          '/_next/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
