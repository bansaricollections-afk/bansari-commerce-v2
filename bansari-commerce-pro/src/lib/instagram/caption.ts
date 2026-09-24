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
 * ratings, no "loved by hundreds", no "handmade by artisans". The shop
 * SOURCES from artisans in Jaipur and from manufacturers — it does not
 * manufacture — and a caption is exactly the kind of casual copy where that
 * distinction gets quietly upgraded into a claim the business cannot support.
 *
 * ── HASHTAG STRATEGY, REWRITTEN ─────────────────────────────────────────────
 *
 * The first version of this file emitted 17 tags per post, 8 of them identical
 * every time, built by splitting multi-word attributes and keeping the last
 * word. It shipped two live posts before the damage was visible:
 *
 *   "Art Silk"    → #silk   on a MUSLIN kurta set. Factually wrong.
 *   "Bell Sleeve" → #sleeve  meaningless.
 *   "Knee Length" → #knee    a body part; attracts nothing relevant.
 *
 * and the rest were mega-tags — #cotton, #black, #dresses, #party — where an
 * account with 138 followers cannot rank against millions of posts.
 *
 * What the current evidence says:
 *
 *  - Meta recommends 3–5 highly relevant hashtags. Exceeding that is reported
 *    to suppress distribution in Explore and Reels recommendations.
 *  - Instagram removed the ability to FOLLOW hashtags in December 2024, which
 *    cut the main distribution path tags used to provide.
 *  - Reusing an identical tag block across posts reads as spam to the ranking
 *    system and gets the account deprioritised. The old code did exactly this.
 *  - Mid-tier, specific tags (roughly 10k–500k posts) outperform mega-tags for
 *    small accounts, because there is a realistic chance of ranking at all.
 *  - Keyword-rich captions now out-reach hashtag-heavy ones. Instagram
 *    classifies the post from its text and imagery, and its search indexes
 *    caption words.
 *
 * So: five tags, compound and specific, rotated per product so no two posts
 * carry the same block — and real effort moved into a caption that reads like
 * a sentence a person would search for.
 *
 * WHY A TAG IS NEVER BUILT FROM PART OF AN ATTRIBUTE
 * The whole value is used or nothing is. "Art Silk" yields #artsilk, never
 * #silk. A hashtag is a public claim about the garment, and a wrong one is
 * worse than a missing one.
 */
import type { Product } from '@/types/product';
import { buildSpecRows, type AttributeIndex } from '@/services/product-attributes';

const SITE = 'https://www.bansaricollection.in';

/** Instagram's product-level caption ceiling. */
export const CAPTION_MAX = 2200;

/**
 * Five. Meta's own recommendation is 3–5, and going past it is reported to
 * suppress reach rather than extend it. The old value here was 30.
 */
export const HASHTAG_MAX = 5;

/**
 * Words that must never become a hashtag, whatever the data says.
 *
 * Two kinds: measurement words that are meaningless alone (#knee, #sleeve),
 * and values so generic that ranking is impossible and the tag only dilutes
 * the signal about what the post actually is.
 */
const BANNED_TAGS = new Set([
  // Meaningless or actively misleading in isolation
  'knee', 'sleeve', 'length', 'neck', 'fit', 'regular', 'straight', 'other',
  'none', 'na', 'standard', 'plain', 'solid', 'calf', 'ankle', 'above', 'below',
  // Mega-tags: hundreds of millions of posts, zero chance for a small account
  'fashion', 'style', 'dress', 'dresses', 'suits', 'party', 'cotton', 'silk',
  'black', 'white', 'blue', 'red', 'green', 'pink', 'beige', 'yellow', 'grey',
  'gray', 'orange', 'purple', 'brown', 'maroon', 'cream', 'floral', 'print',
  'printed', 'women', 'womens', 'clothing', 'outfit', 'ootd', 'love', 'india',
]);

/** "Pure Cotton" → "purecotton". Returns null for anything unusable. */
function toTag(value: string): string | null {
  const tag = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!tag || tag.length < 4 || BANNED_TAGS.has(tag)) return null;
  return tag;
}

/**
 * "Kurta Sets" → "kurtaset", "Dresses" → "dress".
 *
 * Compound tags read as singular in practice — #cottonkurtaset, not
 * #cottonkurtasets — and the singular form is the one people search.
 */
function singular(category: string): string {
  const c = category.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (c.endsWith('ies')) return `${c.slice(0, -3)}y`;
  if (c.endsWith('ses')) return c.slice(0, -2);
  if (c.endsWith('s')) return c.slice(0, -1);
  return c;
}

export type GeneratedCaption = {
  caption: string;
  hashtags: string[];
  usedAttributes: { label: string; value: string }[];
  productUrl: string;
};

/** Local tags, rotated so consecutive posts do not carry the same block. */
const LOCAL_TAGS = [
  'vadodarafashion',
  'vadodaraboutique',
  'vadodarashopping',
  'gujaratfashion',
  'barodadiaries',
];

/** Broad-but-earnable category tags, used only to fill a remaining slot. */
const NICHE_FALLBACK = [
  'indianethnicwear',
  'ethnicwearindia',
  'kurtaseries',
  'handblockprint',
  'indiancraft',
];

/** Deterministic pick — same product always yields the same tags, so what is
 *  previewed is what is published, while different products differ. */
function rotate<T>(pool: T[], seed: number, offset = 0): T {
  return pool[(seed + offset) % pool.length]!;
}

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

  const get = (label: string) => rows.find((r) => r.label === label)?.value ?? null;

  const fabric = get('Fabric');
  const work = get('Work');
  const occasion = get('Occasion');
  const pattern = get('Pattern');
  const category = product.category ?? null;

  const HEADLINE_ATTRS = ['Fabric', 'Work', 'Occasion', 'Fit', 'Length'];
  const detail = rows.filter((r) => HEADLINE_ATTRS.includes(r.label));

  /*
   * A sentence, before the spec list.
   *
   * This is the part that now matters most: Instagram classifies a post from
   * its text and indexes caption words for search, and keyword-rich captions
   * measurably out-reach tag-heavy ones. A list of "Fabric · Muslin" rows is
   * not language anybody searches; "a muslin kurta set with beadwork, for
   * festive days" is.
   *
   * Every clause is drawn from an attribute that exists. A product with no
   * attributes gets no sentence rather than an invented one.
   */
  const clauses: string[] = [];
  if (fabric && category) clauses.push(`A ${fabric.toLowerCase()} ${singular(category)}`);
  else if (category) clauses.push(`A ${singular(category)}`);
  if (work) clauses.push(`with ${work.toLowerCase()}`);
  else if (pattern) clauses.push(`in a ${pattern.toLowerCase()} print`);
  if (occasion) clauses.push(`— made for ${occasion.toLowerCase()} days`);

  const sentence = clauses.length >= 2 ? `${clauses.join(' ')}.` : null;

  const lines: string[] = [product.name.trim(), ''];
  if (sentence) lines.push(sentence, '');
  if (detail.length) lines.push(...detail.map((r) => `${r.label} · ${r.value}`), '');

  lines.push(`₹${Math.round(product.price).toLocaleString('en-IN')}`);
  lines.push('Free shipping over ₹2,099 · Free 7-day returns');
  // Sourcing, stated the same way the site now states it.
  lines.push('Sourced from artisans in Jaipur, chosen in Vadodara.', '');
  /*
   * Instagram never makes caption links tappable. The long UTM URL that used
   * to sit here could only be used by typing it, which nobody did. So the
   * caption now points at the one tappable link a profile has — the bio,
   * which opens /instagram with every posted piece — and offers a short link
   * short enough to type from memory. /p/[id] adds the UTM tags on the way
   * through, so the visit is still attributed to Instagram.
   */
  lines.push('🛍 Tap the link in our bio to shop this piece');
  lines.push(`or visit bansaricollection.in/p/${product.id}`);

  const hashtags = buildHashtags({ fabric, work, occasion, pattern, category, id: product.id });

  let caption = lines.join('\n');
  const tagBlock = '\n\n' + hashtags.map((t) => `#${t}`).join(' ');

  if (caption.length + tagBlock.length > CAPTION_MAX) {
    caption = caption.slice(0, CAPTION_MAX - tagBlock.length - 1).trimEnd();
  }

  return { caption: caption + tagBlock, hashtags, usedAttributes: detail, productUrl };
}

/**
 * Five tags, most specific first.
 *
 * Compounds are the point. #cottonkurtaset is searched by someone who wants a
 * cotton kurta set; #cotton is searched by nobody in particular and ranked by
 * accounts with a million followers. The compound is narrower, which is
 * exactly why a small account can appear in it.
 */
function buildHashtags(p: {
  fabric: string | null;
  work: string | null;
  occasion: string | null;
  pattern: string | null;
  category: string | null;
  id: number;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null) => {
    if (!raw || out.length >= HASHTAG_MAX) return;
    const tag = toTag(raw);
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    out.push(tag);
  };

  const cat = p.category ? singular(p.category) : null;

  // 1. Garment + fabric — the most specific true thing about the product.
  if (p.fabric && cat) push(`${p.fabric} ${cat}`);

  // 2. The craft. These are genuinely mid-tier and carry buying intent:
  //    somebody searching #mirrorwork wants mirror work.
  push(p.work);

  // 3. Occasion tied to the garment, not the bare word.
  if (p.occasion && cat) push(`${p.occasion} ${cat}`);
  else if (p.pattern && cat) push(`${p.pattern} ${cat}`);

  // 4. Local. Rotated by product id so two posts in a row differ — an
  //    identical block every time is the spam signal this rewrite exists to
  //    remove.
  push(rotate(LOCAL_TAGS, p.id));

  // 5. The brand's own tag, so the account's posts and any customer photos
  //    collect in one place. Worth a slot precisely because nobody competes
  //    for it.
  push('bansaricollections');

  // Only if the catalogue was too sparse to fill five.
  for (let i = 0; out.length < HASHTAG_MAX && i < NICHE_FALLBACK.length; i += 1) {
    push(rotate(NICHE_FALLBACK, p.id, i));
  }

  return out;
}
