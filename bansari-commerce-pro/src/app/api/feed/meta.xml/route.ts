/**
 * Meta (Facebook/Instagram) catalogue feed — RSS 2.0 with the g: namespace.
 *
 * Add as a scheduled feed in Commerce Manager:
 *   Catalogue → Data sources → Add items → Scheduled feed →
 *   https://www.bansaricollection.in/api/feed/meta.xml
 *
 * This is what enables Advantage+ Catalog ads and dynamic retargeting — the
 * formats that show a shopper the exact garment they viewed. It is the payoff
 * for the ViewContent / AddToCart / Purchase events already being reported:
 * without a catalogue, those events describe products Meta cannot render.
 *
 * Meta accepts Google's RSS format, so this shares its builder with the
 * Merchant Center feed. It is a separate route rather than one shared URL
 * because the two platforms differ in ways that matter (below) and will
 * diverge further as either spec changes.
 */
import {
  getFeedItems,
  escapeXml,
  formatPrice,
  feedBaseUrl,
  FEED_BRAND,
} from '@/lib/product-feed';

/*
 * Same reasoning as the Google feed: rendered on request and cached for an
 * hour at the edge, rather than prerendered with `export const revalidate`,
 * so a Supabase failure at build time can never fail the deployment.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const base = feedBaseUrl();
  const items = await getFeedItems();

  const entries = items
    .map((item) => {
      const parts: string[] = [
        /*
         * THE join key. Meta matches this against the pixel's content_ids and
         * the Conversions API's contents[].id — both of which send product.id.
         * A mismatch does not error: the feed imports, events fire, and
         * Advantage+ Catalog simply never has a product to show. See
         * src/lib/product-feed.ts.
         */
        `<g:id>${escapeXml(item.id)}</g:id>`,
        `<g:title>${escapeXml(item.title)}</g:title>`,
        `<g:description>${escapeXml(item.description)}</g:description>`,
        `<g:link>${escapeXml(item.link)}</g:link>`,
        `<g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
        /*
         * Meta's spec uses a space ("in stock"), not Google's underscore.
         * The wrong form is silently coerced or rejected per-row depending on
         * the importer's mood, so it is written explicitly for each platform
         * rather than shared.
         */
        `<g:availability>${item.inStock ? 'in stock' : 'out of stock'}</g:availability>`,
        `<g:condition>new</g:condition>`,
        `<g:price>${escapeXml(formatPrice(item.price))}</g:price>`,
        `<g:brand>${escapeXml(item.brand)}</g:brand>`,
      ];

      for (const url of item.additionalImageLinks) {
        parts.push(`<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`);
      }

      if (item.salePrice !== null) {
        parts.push(`<g:sale_price>${escapeXml(formatPrice(item.salePrice))}</g:sale_price>`);
      }

      if (item.productType) {
        parts.push(`<g:product_type>${escapeXml(item.productType)}</g:product_type>`);
      }
      if (item.color) {
        parts.push(`<g:color>${escapeXml(item.color)}</g:color>`);
      }
      if (item.material) {
        parts.push(`<g:material>${escapeXml(item.material)}</g:material>`);
      }

      /*
       * Meta has no identifier_exists field and does not require a GTIN, so
       * unlike the Google feed there is nothing to declare when a SKU is
       * absent — the item is simply listed without one.
       */
      if (item.mpn) {
        parts.push(`<g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
      }

      for (const size of item.sizes) {
        parts.push(`<g:size>${escapeXml(size)}</g:size>`);
      }

      return `    <item>\n      ${parts.join('\n      ')}\n    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(FEED_BRAND)}</title>
    <link>${escapeXml(base)}</link>
    <description>Premium Indian ethnic wear — sarees, lehengas, salwar suits and more.</description>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
