/**
 * Caption and hashtag generation from real catalogue data.
 *
 * WHY THIS IS GENERATED AND NOT TYPED BY HAND
 * The attributes were already entered once, in the admin: fabric, work,
 * occasion, colour, fit, neckline. Retyping them into a caption is where
 * drift begins — the post says "pure cotton" while the product page says
 * linen, and the customer who notices trusts neither.
 *
 * THE TRUTH RULE APPLIES HERE TOO
 * Everything below is either queried or a published policy. No invented
 * ratings, no "loved by hundreds", no "handmade by artisans", no founding
 * year. The shop SOURCES from artisans and manufacturers — it does not
 * manufacture — and a caption is exactly the kind of casual copy where that
 * distinction gets quietly upgraded into a claim the business cannot support.
 *
 * WHY A LINK IS IN THE CAPTION AT ALL
 * Instagram captions are not clickable. The URL is there for people who will
 * type it, and more importantly the UTM tags mean the visits it does produce
 * are attributable in Analytics. A post that cannot be measured cannot be
 * repeated on purpose.
 */
import type { Product } from '@/types/product';
import { buildSpecRows, type AttributeIndex } from '@/services/product-attributes';

const SITE = 'https://www.bansaricollection.in';

/** Instagram's product-level caption ceiling. */
export const CAPTION_MAX = 2200;

/** Instagram silently ignores hashtags past the 30th on a post. */
export const HASHTAG_MAX = 30;

/** Hashtags that describe the shop rather than the garment. */
const BRAND_TAGS = [
  'bansaricollections',
  'vadodara',
  'vadodarafashion',
  'vadodaraboutique',
  'indianwear',
  'ethnicwear',
  'indianethnicwear',
  'womensfashionindia',
];

/**
 * Attribute labels that make poor hashtags — too generic to reach anyone, and
 * they crowd out the specific ones that might. "#plain" was already found to
 * be the single largest and least useful bucket in the catalogue when building
 * the browse landings; the same reasoning applies to a caption.
 */
const WEAK_TAGS = new Set(['plain', 'regular', 'other', 'none', 'na', 'standard', 'solid']);

/** "Pure Cotton" → "purecotton". Hashtags cannot carry spaces or punctuation. */
function toTag(value: string): string | null {
  const tag = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!tag || tag.length < 3 || WEAK_TAGS.has(tag)) return null;
  return tag;
}

export type GeneratedCaption = {
  caption: string;
  hashtags: string[];
  /** Spec rows used, so the admin can see what the caption was built from. */
  usedAttributes: { label: string; value: string }[];
  productUrl: string;
};

/**
 * Build the caption for one product.
 *
 * The shape is deliberate and matches how the storefront already speaks:
 * the product name as the headline, the details that justify the price, the
 * practical facts, then where to buy. No emoji wall, no "DM to order" — the
 * site takes orders, and sending people to DMs abandons the traffic this
 * whole exercise exists to create.
 */
export function buildCaption(product: Product, index: AttributeIndex): GeneratedCaption {
  const productUrl =
    `${SITE}/product/${product.id}` +
    `?utm_source=instagram&utm_medium=social&utm_campaign=product_post`;

  const rows = buildSpecRows(
    {
      attrFabricId: product.attrFabricId,
      attrColorId: product.attrColorId,
      attrOccasionId: product.attrOccasionId,
      attrPatternId: product.attrPatternId,
      attrFitId: product.attrFitId,
      attrSleeveId: product.attrSleeveId,
      attrNeckId: product.attrNeckId,
      attrBottomId: product.attrBottomId,
      attrWorkId: product.attrWorkId,
      attrLengthId: product.attrLengthId,
      category: product.category,
    },
    index
  );

  // Only the attributes a buyer scanning a caption actually weighs. The full
  // set belongs on the product page, which is where the link goes.
  const HEADLINE_ATTRS = ['Fabric', 'Work', 'Occasion', 'Fit', 'Length'];
  const detail = rows.filter((r) => HEADLINE_ATTRS.includes(r.label));

  const lines: string[] = [product.name.trim(), ''];

  if (detail.length) {
    lines.push(...detail.map((r) => `${r.label} · ${r.value}`), '');
  }

  // Price is a fact and the most common question. Omitting it to drive DMs
  // costs more visits than it earns conversations.
  lines.push(`₹${Math.round(product.price).toLocaleString('en-IN')}`);

  // Both restate published policy verbatim — see /shipping-policy and
  // /return-refund-policy. Nothing here is a new promise.
  lines.push('Free shipping over ₹2,099 · Free 7-day returns', '');
  lines.push(`Shop → ${productUrl}`);

  const hashtags = buildHashtags(product, rows);

  let caption = lines.join('\n');
  const tagBlock = '\n\n' + hashtags.map((t) => `#${t}`).join(' ');

  // Truncate the body, never the tags — a half-written hashtag is noise, and
  // the body's most important line (the link) sits at the end.
  if (caption.length + tagBlock.length > CAPTION_MAX) {
    caption = caption.slice(0, CAPTION_MAX - tagBlock.length - 1).trimEnd();
  }

  return {
    caption: caption + tagBlock,
    hashtags,
    usedAttributes: detail,
    productUrl,
  };
}

/**
 * Hashtags, specific first.
 *
 * Attribute tags come from this product's own data, so they describe the
 * actual garment. Brand and city tags fill the remainder. Ordering matters
 * because the cap truncates the tail.
 */
function buildHashtags(product: Product, rows: { label: string; value: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw?: string | null) => {
    if (!raw || out.length >= HASHTAG_MAX) return;
    const tag = toTag(raw);
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    out.push(tag);
  };

  // Multi-word attributes give two useful tags: the whole phrase and its head
  // noun — "Pure Cotton" yields #purecotton and #cotton, which are searched
  // very differently.
  for (const row of rows) {
    push(row.value);
    const words = row.value.trim().split(/\s+/);
    if (words.length > 1) push(words[words.length - 1]);
  }

  push(product.category);
  for (const t of BRAND_TAGS) push(t);

  return out;
}
