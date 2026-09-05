/**
 * Google Merchant Center product feed — RSS 2.0 with the g: namespace.
 *
 * Submit as a scheduled fetch in Merchant Center:
 *   Products → Feeds → Add → Scheduled fetch →
 *   https://www.bansaricollection.in/api/feed/google.xml
 *
 * This is what makes Shopping and Performance Max possible; without it Google
 * campaigns are limited to text and static creative.
 *
 * Publicly readable by design — Google fetches it unauthenticated, and every
 * field in it is already visible on the product page.
 */
import {
  getFeedItems,
  escapeXml,
  formatPrice,
  feedBaseUrl,
  FEED_BRAND,
} from '@/lib/product-feed';

/*
 * Rendered on request and cached for an hour at the edge by the Cache-Control
 * header below — NOT prerendered via `export const revalidate`.
 *
 * That distinction is load-bearing. `revalidate` makes Next build this route
 * at deploy time, which means a momentary Supabase failure during a build
 * fails the entire deployment. A catalogue feed must never be able to block a
 * release, and it was doing exactly that: the first build attempt died with
 * "Export encountered an error on /api/feed/google.xml".
 *
 * s-maxage gives the same once-an-hour database load, since Vercel's edge
 * serves the cached copy, and stale-while-revalidate means a crawl never waits
 * on a rebuild.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const base = feedBaseUrl();
  const items = await getFeedItems();

  const entries = items
    .map((item) => {
      const parts: string[] = [
        // g:id is the join key to the pixel's content_ids. See product-feed.ts.
        `<g:id>${escapeXml(item.id)}</g:id>`,
        `<g:title>${escapeXml(item.title)}</g:title>`,
        `<g:description>${escapeXml(item.description)}</g:description>`,
        `<g:link>${escapeXml(item.link)}</g:link>`,
        `<g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
        `<g:availability>${item.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `<g:condition>new</g:condition>`,
        `<g:price>${escapeXml(formatPrice(item.price))}</g:price>`,
        `<g:brand>${escapeXml(item.brand)}</g:brand>`,
        `<g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>`,
        /*
         * REQUIRED for apparel. Merchant Center disapproves every clothing
         * item that omits gender or age_group — the whole feed was being
         * rejected on this alone.
         *
         * Hardcoded because the catalogue is exclusively womenswear; there is
         * no menswear or childrenswear column to read, so inventing a lookup
         * would be more fragile than the constant. If the range ever widens,
         * these must become per-product fields rather than staying silently
         * wrong.
         */
        `<g:gender>female</g:gender>`,
        `<g:age_group>adult</g:age_group>`,
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
       * Google requires either a GTIN or brand+MPN, and rejects the product
       * outright if it has neither and does not say so. These garments carry
       * no barcode, so the SKU is offered as MPN where one exists and
       * identifier_exists is set to no otherwise — the explicit, supported way
       * to declare "this product genuinely has no manufacturer identifier".
       */
      if (item.mpn) {
        parts.push(`<g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
      } else {
        parts.push(`<g:identifier_exists>no</g:identifier_exists>`);
      }

      /*
       * ONE ITEM PER SIZE, linked by item_group_id.
       *
       * This previously emitted several <g:size> elements inside a single
       * item, on the reasoning that one entry per product keeps ids matching
       * what the Meta pixel reports. Google does not accept that shape: an
       * apparel item carries exactly ONE size, and variants of the same
       * garment are separate items joined by `item_group_id`. Sending repeated
       * sizes meant every item was malformed.
       *
       * The pixel concern still holds, but it belongs to the Meta feed, which
       * is generated separately (api/feed/meta.xml) and still emits one entry
       * per product under the bare product id. So Google gets the structure it
       * requires without changing what the pixel matches on.
       *
       * A product with no size list still produces a single item, unchanged.
       */
      if (item.sizes.length === 0) {
        return `    <item>\n      ${parts.join('\n      ')}\n    </item>`;
      }

      return item.sizes
        .map((size) => {
          const variant = [
            // Variant id must be unique and stable; the group id ties them back
            // to one product so Shopping shows a single listing with sizes.
            `<g:id>${escapeXml(`${item.id}-${size}`)}</g:id>`,
            `<g:item_group_id>${escapeXml(item.id)}</g:item_group_id>`,
            ...parts.slice(1),
            `<g:size>${escapeXml(size)}</g:size>`,
          ];
          return `    <item>\n      ${variant.join('\n      ')}\n    </item>`;
        })
        .join('\n');
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
      // Lets Vercel's edge serve the cached copy and revalidate behind it, so
      // Google never waits on a rebuild.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
