/**
 * product-feed.ts
 * ---------------
 * Builds the product catalogue that Google Merchant Center and Meta Commerce
 * Manager ingest, shared by both feed routes so the two can never disagree
 * about what is in stock or what something costs.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 *
 * A feed is what unlocks Shopping / Performance Max and Advantage+ Catalog —
 * the formats that actually perform for apparel, because they put the garment
 * itself in the ad. Without one, spend is limited to static creative.
 *
 * THE ONE INVARIANT THAT CANNOT BE GOT WRONG
 *
 * `id` here MUST equal what the pixel sends as `content_ids` and what the
 * Conversions API sends as `contents[].id` — that is `product.id`, set in
 * src/analytics/events.ts and src/lib/meta-capi.ts.
 *
 * If they diverge, nothing errors. The feed imports, the pixel fires, and
 * Meta simply never matches a purchase to a catalogue item — so dynamic
 * retargeting silently has nothing to retarget with. That failure is
 * invisible in every dashboard, which is exactly what makes it dangerous.
 *
 * For the same reason there is ONE ENTRY PER PRODUCT, not per size. The cart
 * carries a variantSku for size-managed products, but the pixel deliberately
 * reports product.id at every funnel step (see the comment in events.ts), so a
 * size-split feed would be keyed on ids the pixel never sends. Sizes are
 * declared on the single entry instead.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getSizeAvailabilityMap } from '@/services/size-inventory.service';

export const FEED_BRAND = 'Bansari Collections';

/** Merchant Center rejects a feed above this; also a sane safety bound. */
const MAX_ITEMS = 20000;

/** Google allows 10 additional images beyond the primary. */
const MAX_ADDITIONAL_IMAGES = 10;

export type FeedItem = {
  /** product.id — must match the pixel's content_ids. Never sku. */
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  inStock: boolean;
  /** Regular price. When discounted this is the compare-at price. */
  price: number;
  /** Set only when the product is genuinely discounted. */
  salePrice: number | null;
  brand: string;
  mpn: string | null;
  /** Our own taxonomy, sent as product_type. */
  productType: string | null;
  googleProductCategory: string;
  sizes: string[];
  color: string | null;
  material: string | null;
};

type ProductRow = {
  id: number;
  name: string;
  slug: string | null;
  price: number | null;
  compare_price: number | null;
  stock: number | null;
  images: unknown;
  category: string | null;
  description: string | null;
  seo_description: string | null;
  sizes: unknown;
  sku: string | null;
  fabric: string | null;
  color: string | null;
};

/**
 * Google's taxonomy, in the text-path form (Google accepts either this or the
 * numeric id). Everything falls back to generic Clothing, which is always
 * valid — a wrong specific category is worse than a correct broad one, because
 * Google uses it to decide which searches the product can appear in.
 *
 * Refining these per category measurably improves Shopping performance and is
 * the cheapest optimisation available here.
 */
const GOOGLE_CATEGORY_FALLBACK = 'Apparel & Accessories > Clothing';

const GOOGLE_CATEGORY_BY_KEYWORD: Array<[RegExp, string]> = [
  [/dupatta|stole|scarf|shawl/i, 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls'],
  [/saree|sari|lehenga|gown|dress|anarkali|kurti/i, 'Apparel & Accessories > Clothing > Dresses'],
  [/salwar|palazzo|pant|trouser|churidar/i, 'Apparel & Accessories > Clothing > Pants'],
  [/blouse|top|kurta|shirt/i, 'Apparel & Accessories > Clothing > Shirts & Tops'],
  [/skirt|ghagra/i, 'Apparel & Accessories > Clothing > Skirts'],
];

function googleCategoryFor(category: string | null, name: string): string {
  const haystack = `${category ?? ''} ${name}`;
  for (const [pattern, value] of GOOGLE_CATEGORY_BY_KEYWORD) {
    if (pattern.test(haystack)) return value;
  }
  return GOOGLE_CATEGORY_FALLBACK;
}

/** XML text escaping. Applied to every interpolated value without exception. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Both platforms reject markup in description and truncate hard. Tags are
 * stripped rather than escaped so the text reads as prose, and whitespace is
 * collapsed because the admin editor emits newlines liberally.
 */
function plainText(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Absolute URLs only — a relative image_link is rejected on import. */
function absoluteUrl(url: string, base: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function imageUrls(images: unknown, base: string): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (!img || typeof img !== 'object') return null;
      const record = img as Record<string, unknown>;
      // Video entries carry a url too but are not valid catalogue images.
      if (record.mediaType === 'video') return null;
      const url = typeof record.url === 'string' ? record.url : null;
      return url ? absoluteUrl(url, base) : null;
    })
    .filter((u): u is string => Boolean(u));
}

function sizeList(sizes: unknown): string[] {
  if (Array.isArray(sizes)) {
    return sizes.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  }
  if (typeof sizes === 'string' && sizes.trim().length > 0) {
    return sizes.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function feedBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in'
  ).replace(/\/$/, '');
}

/**
 * Fetch every sellable product and shape it for both feeds.
 *
 * Products with no image are DROPPED rather than emitted: image_link is
 * mandatory on both platforms, so an imageless row would be rejected at import
 * and count against the account's feed error rate. Better to publish a smaller
 * clean catalogue than a large rejected one.
 *
 * A query failure THROWS, and the routes deliberately do not catch it. That is
 * the safe direction: a 5xx makes Google and Meta keep the last good feed and
 * retry, whereas returning an empty catalogue tells them every product has
 * been withdrawn — which disables the ads, drops the listings, and takes days
 * of re-review to recover from. An outage must never look like a closing-down
 * sale.
 */
export async function getFeedItems(): Promise<FeedItem[]> {
  const base = feedBaseUrl();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, price, compare_price, stock, images, category, description, seo_description, sizes, sku, fabric, color'
    )
    .eq('active', true)
    .order('id', { ascending: true })
    .limit(MAX_ITEMS);

  if (error) throw new Error(`product feed query failed: ${error.message}`);
  const rows = (data ?? []) as ProductRow[];
  if (rows.length === 0) return [];

  /*
   * Size-managed products hold their stock on variants, not on products.stock,
   * so the product-level column reads 0 for them. Treating that as sold out
   * would hide the entire size-managed catalogue from Shopping ads.
   */
  const availabilityMap = await getSizeAvailabilityMap(rows.map((r) => r.id));

  const items: FeedItem[] = [];

  for (const row of rows) {
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    const images = imageUrls(row.images, base);
    if (images.length === 0) continue;

    const sizes = availabilityMap.get(row.id);
    const inStock =
      sizes && sizes.length > 0
        ? sizes.some((s) => s.available > 0)
        : (row.stock ?? 0) > 0;

    /*
     * Google's `price` is the REGULAR price and `sale_price` the discounted
     * one. Our columns are the other way round — `price` is what the customer
     * pays and `compare_price` is the struck-through original — so they are
     * swapped here. Sending the sale price as `price` would make every
     * discount invisible and forfeit the sale-price annotation in Shopping.
     */
    const comparePrice = Number(row.compare_price);
    const hasDiscount = Number.isFinite(comparePrice) && comparePrice > price;

    const description =
      plainText(row.description, 5000) ||
      plainText(row.seo_description, 5000) ||
      `${row.name} — premium Indian ethnic wear by ${FEED_BRAND}.`;

    items.push({
      id: String(row.id),
      title: plainText(row.name, 150),
      description,
      link: `${base}/product/${row.id}`,
      imageLink: images[0],
      additionalImageLinks: images.slice(1, 1 + MAX_ADDITIONAL_IMAGES),
      inStock,
      price: hasDiscount ? comparePrice : price,
      salePrice: hasDiscount ? price : null,
      brand: FEED_BRAND,
      mpn: row.sku?.trim() || null,
      productType: row.category?.trim() || null,
      googleProductCategory: googleCategoryFor(row.category, row.name),
      sizes: sizes && sizes.length > 0 ? sizes.map((s) => s.label) : sizeList(row.sizes),
      color: row.color?.trim() || null,
      material: row.fabric?.trim() || null,
    });
  }

  return items;
}

/** Prices must carry the currency: "1299.00 INR". */
export function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} INR`;
}
