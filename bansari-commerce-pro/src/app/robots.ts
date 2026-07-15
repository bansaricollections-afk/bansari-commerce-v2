import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/auth/",
          "/api/",
          "/cart/",
          "/checkout/",
          "/wishlist/",
          "/order-success/",
          "/order-failed/",
        ],
      },
    ],
    sitemap: "https://www.bansaricollection.in/sitemap.xml",
  };
}
