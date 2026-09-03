import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getShopFacets } from '@/services/shop-facets';
import { collectionSlug } from '@/lib/collection-slug';

/**
 * Auto-generates /sitemap.xml via Next.js Metadata API.
 *
 * Includes:
 *   - Static marketing pages (always)
 *   - All active products (fetched at build time / ISR)
 *
 * URLs match the actual Next.js routes in /src/app.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/new-arrivals`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/shipping-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/return-refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/exchange-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/cancellation-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/terms-and-conditions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, slug, updated_at')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (products) {
      productPages = products.map((p) => ({
        url: `${base}/product/${p.id}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Sitemap generation must never fail the build.
  }

  /*
   * Collection landing pages.
   *
   * Derived from getShopFacets, which returns only collections holding at least
   * one live product — so the sitemap can never advertise an empty page. The
   * `collections` table is deliberately not the source: it lists
   * bridal-collection and sale, which contain nothing.
   */
  let collectionPages: MetadataRoute.Sitemap = [];
  try {
    const { collections } = await getShopFacets();
    collectionPages = collections.map((name) => ({
      url: `${base}/collections/${collectionSlug(name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Same contract as above.
  }

  return [...staticPages, ...collectionPages, ...productPages];
}
