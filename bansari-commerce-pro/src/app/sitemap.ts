import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getShopFacets } from '@/services/shop-facets';
import { collectionSlug } from '@/lib/collection-slug';
import { getBrowseLandings } from '@/services/browse-landings';
import { guides } from '@/content/guides';

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

  /*
   * lastmod must be a real change date. It was `new Date()` on 43 URLs, so
   * every fetch claimed they had just changed; Google learns to ignore a
   * sitemap's lastmod when it is always "now", which slows recrawling of the
   * pages that really did change. Catalog-driven pages use the newest product
   * change; policy pages omit lastmod rather than invent one.
   */
  let newestProduct: Date | null = null;
  const catalogUpdated = () => newestProduct ?? undefined;

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, slug, updated_at')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (products) {
      if (products[0]) newestProduct = new Date(products[0].updated_at);
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

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: catalogUpdated(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/shop`, lastModified: catalogUpdated(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/collections`, lastModified: catalogUpdated(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/new-arrivals`, lastModified: catalogUpdated(), changeFrequency: 'daily', priority: 0.8 },
    // Local landing page. Higher priority than the other static pages because
    // local search is the one channel a young domain can rank in now.
    { url: `${base}/ethnic-wear-vadodara`, lastModified: catalogUpdated(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/shipping-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/return-refund-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/exchange-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/cancellation-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/terms-and-conditions`, changeFrequency: 'monthly', priority: 0.4 },
  ];


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
      lastModified: catalogUpdated(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Same contract as above.
  }

  /*
   * Browse landing pages (/shop/<slug>) — category, fabric and fabric+category.
   * Only filters with at least MIN_PRODUCTS behind them are generated, so the
   * sitemap can never list a near-empty doorway page.
   */
  let browsePages: MetadataRoute.Sitemap = [];
  try {
    const landings = await getBrowseLandings();
    browsePages = landings.map((l) => ({
      url: `${base}/shop/${l.slug}`,
      lastModified: catalogUpdated(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Same contract as above.
  }

  /* Guides — static content, so no try/catch and no query. */
  const guidePages: MetadataRoute.Sitemap = [
    {
      url: `${base}/guides`,
      lastModified: new Date(
        Math.max(...guides.map((g) => new Date(g.updatedAt).getTime()))
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...guides.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return [
    ...staticPages,
    ...collectionPages,
    ...browsePages,
    ...guidePages,
    ...productPages,
  ];
}
