import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const BASE_URL = 'https://www.bansaricollection.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Fetch all published products
  const { data: products } = await supabase
    .from('products')
    .select('id, updated_at')
    .eq('is_active', true);

  // Fetch all active categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${BASE_URL}/product/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE_URL}/collections/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/new-arrivals`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms-and-conditions`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/shipping-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/return-refund-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/cancellation-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [...staticUrls, ...productUrls, ...categoryUrls];
}
