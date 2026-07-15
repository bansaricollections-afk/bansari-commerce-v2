import type { MetadataRoute } from "next";
import { getProducts } from "@/services/product.service";

const SITE_URL = "https://www.bansaricollection.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/collections`,
      lastModified: generatedAt,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/new-arrivals`,
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: generatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms-and-conditions`,
      lastModified: generatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/shipping-policy`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/return-refund-policy`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cancellation-policy`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productRoutes = products.map((product) => ({
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: product.updatedAt
        ? new Date(product.updatedAt)
        : generatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    // getProducts() failure — return static routes only, never throw.
  }

  return [...staticRoutes, ...productRoutes];
}
