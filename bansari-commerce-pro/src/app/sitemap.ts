import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/service';

/**
 * Auto-generates /sitemap.xml via Next.js Metadata API.
 *
 * Includes:
 *   - Static marketing pages (always)
 *   - All active, non-deleted products (fetched at build time / ISR)
 *
 * Product pages use weekly changefreq; static pages use monthly.
 * Priority follows standard SEO convention: home=1.0, collections=0.8,
 * products=0.7, static=0.5.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bansaricollections.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/shop`,               lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/collections`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/about`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/shipping-policy`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/return-policy`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy-policy`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/terms-of-service`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Product pages — fetched from DB; fails gracefully (returns static-only)
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClient();
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('active', true)
      .is('deleted_at' as never, null)
      .order('updated_at', { ascending: false });

    if (products) {
      productPages = products.map((p) => ({
        url:             `${base}/products/${p.slug}`,
        lastModified:    new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority:        0.7,
      }));
    }
  } catch {
    // Sitemap generation must never fail the build.
  }

  return [...staticPages, ...productPages];
}
