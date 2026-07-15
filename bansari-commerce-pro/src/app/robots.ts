import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/checkout/',
          '/order-success/',
          '/order-failed/',
        ],
      },
    ],
    sitemap: 'https://www.bansaricollection.in/sitemap.xml',
    host: 'https://www.bansaricollection.in',
  };
}
