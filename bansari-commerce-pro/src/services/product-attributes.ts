/**
 * Product attribute resolution — turns the `attr_*_id` foreign keys the admin
 * writes into the human labels the storefront shows.
 *
 * WHY THIS EXISTS
 * The Add Product form saves every structured attribute as an id into its own
 * lookup table: attr_fabric, attr_fit, attr_neck, attr_sleeve, attr_length,
 * attr_occasion, attr_pattern, attr_work, attr_bottom, attr_color. Across the
 * live catalogue that is 43 products with a fabric, 43 with a fit, 41 with a
 * neckline, and so on — real, carefully entered data.
 *
 * None of it ever reached a product page. The storefront's PRODUCT_SELECT did
 * not fetch a single attr_*_id column, and the one place that rendered
 * specifications read `products.specifications` — a JSONB column populated on
 * exactly one product out of fifty-six. The admin wrote to one set of columns
 * and the storefront read a different one, so every page showed a description
 * and nothing else.
 *
 * All ten tables together are a couple of hundred short rows, so they are
 * fetched once and cached per request rather than joined per product. That
 * keeps the shop grid — which maps over dozens of products — at one extra
 * query for the whole page instead of ten per row.
 */
import { cache } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/service';

/** Lookup table name → the products column that references it. */
const ATTRIBUTE_TABLES = {
  attr_fabric:   'attr_fabric_id',
  attr_color:    'attr_color_id',
  attr_occasion: 'attr_occasion_id',
  attr_pattern:  'attr_pattern_id',
  attr_fit:      'attr_fit_id',
  attr_sleeve:   'attr_sleeve_id',
  attr_neck:     'attr_neck_id',
  attr_bottom:   'attr_bottom_id',
  attr_work:     'attr_work_id',
  attr_length:   'attr_length_id',
} as const;

export type AttributeTable = keyof typeof ATTRIBUTE_TABLES;

/** id → label, per lookup table. */
export type AttributeIndex = Record<AttributeTable, Map<number, string>>;

function emptyIndex(): AttributeIndex {
  return Object.fromEntries(
    (Object.keys(ATTRIBUTE_TABLES) as AttributeTable[]).map((t) => [t, new Map<number, string>()])
  ) as AttributeIndex;
}

/**
 * Every attribute option, keyed by table then id.
 *
 * React-cached so the PDP, its metadata, the shop grid and the JSON-LD share
 * one read per request. Never throws: a lookup failure must degrade to "no
 * specification rows", not a 500 on a product page.
 */
export const getAttributeIndex = cache(async function getAttributeIndex(): Promise<AttributeIndex> {
  const index = emptyIndex();

  try {
    const sb = createServiceRoleClient();
    const tables = Object.keys(ATTRIBUTE_TABLES) as AttributeTable[];

    const results = await Promise.all(
      tables.map((table) => sb.from(table).select('id, name'))
    );

    results.forEach((result, i) => {
      const table = tables[i]!;
      if (result.error || !result.data) return;
      for (const row of result.data as { id: number; name: string | null }[]) {
        if (typeof row.id === 'number' && row.name) index[table].set(row.id, row.name);
      }
    });
  } catch {
    // Degrades to an empty index — the spec table simply renders nothing.
  }

  return index;
});

/** One row of the product specification table. */
export type ProductSpecRow = { label: string; value: string };

/**
 * The raw attribute columns a product carries. Deliberately loose: this is fed
 * straight from a Supabase row, and every field is optional because the
 * catalogue is only partly filled in.
 */
export type ProductAttributeSource = {
  attrFabricId?: number | null;
  attrColorId?: number | null;
  attrOccasionId?: number | null;
  attrPatternId?: number | null;
  attrFitId?: number | null;
  attrSleeveId?: number | null;
  attrNeckId?: number | null;
  attrBottomId?: number | null;
  attrWorkId?: number | null;
  attrLengthId?: number | null;
  /* Free-text fallbacks, used only where no attribute id is set. */
  sku?: string | null;
  fabric?: string | null;
  color?: string | null;
  category?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
  countryOfOrigin?: string | null;
};

/**
 * Build the specification rows for one product.
 *
 * Order is chosen for how a buyer reads a garment listing: what it is made of,
 * how it is cut, what it looks like, when to wear it, then the practical
 * footnotes.
 *
 * A row is emitted ONLY when its value genuinely exists. A half-filled product
 * yields a shorter table — never a row reading "N/A", "-" or an empty cell.
 * That is the same rule the rest of this storefront follows: show what is
 * true, omit what is not, and never pad a section to look complete.
 */
export function buildSpecRows(
  product: ProductAttributeSource,
  index: AttributeIndex
): ProductSpecRow[] {
  const lookup = (table: AttributeTable, id?: number | null): string | null =>
    typeof id === 'number' ? index[table].get(id) ?? null : null;

  const clean = (value?: string | null): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const candidates: [string, string | null][] = [
    // Attribute id first, free text only as a fallback — the id is the value
    // the merchant picked from a controlled list, so it is the canonical one.
    ['Fabric',        lookup('attr_fabric', product.attrFabricId)   ?? clean(product.fabric)],
    ['Colour',        lookup('attr_color', product.attrColorId)     ?? clean(product.color)],
    ['Fit',           lookup('attr_fit', product.attrFitId)],
    ['Neckline',      lookup('attr_neck', product.attrNeckId)],
    ['Sleeves',       lookup('attr_sleeve', product.attrSleeveId)],
    ['Length',        lookup('attr_length', product.attrLengthId)],
    ['Pattern',       lookup('attr_pattern', product.attrPatternId)],
    ['Work',          lookup('attr_work', product.attrWorkId)],
    ['Bottom',        lookup('attr_bottom', product.attrBottomId)],
    ['Occasion',      lookup('attr_occasion', product.attrOccasionId)],
    ['Category',      clean(product.category)],
    // Carried over from the accordion panel this section replaced.
    ['Style Code',    clean(product.sku)],
    ['Package Contents', clean(product.packageContents)],
    ['Wash Care',     clean(product.careInstructions)],
    ['Country of Origin', clean(product.countryOfOrigin)],
  ];

  return candidates
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({ label, value }));
}

/**
 * Resolve an attribute NAME to its id, case-insensitively.
 *
 * Filters travel through URLs as readable words — /shop?occasion=Festive reads
 * like the rest of the shop's filters and like the browse landings, where
 * /shop?attr_occasion_id=2 would not. The name is resolved here, once, against
 * the same cached index everything else uses.
 *
 * Returns null for an unknown name so the caller can decide: a filter that
 * matches nothing should return no products, not silently return everything.
 */
export async function resolveAttributeId(
  table: AttributeTable,
  name: string
): Promise<number | null> {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;

  const index = await getAttributeIndex();
  for (const [id, label] of index[table]) {
    if (label.trim().toLowerCase() === wanted) return id;
  }
  return null;
}

/** Every attribute label in use by at least one active product, with counts. */
export async function getAttributeUsage(
  table: AttributeTable,
  column: string
): Promise<Map<string, number>> {
  const usage = new Map<string, number>();
  try {
    const index = await getAttributeIndex();
    const sb = createServiceRoleClient();
    const { data, error } = await sb.from('products').select(`id, ${column}`).eq('active', true);
    if (error || !data) return usage;

    // Supabase infers a ParserError for a template-literal select string, so
    // the cast goes through `unknown` — the sanctioned pattern in this codebase
    // when the compiler sees no structural overlap.
    for (const row of data as unknown as Record<string, unknown>[]) {
      const id = row[column];
      if (typeof id !== 'number') continue;
      const label = index[table].get(id);
      if (!label) continue;
      usage.set(label, (usage.get(label) ?? 0) + 1);
    }
  } catch {
    // An empty facet is a survivable outcome; a thrown one is not.
  }
  return usage;
}
