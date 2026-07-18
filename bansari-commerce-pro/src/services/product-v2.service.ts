/**
 * Product Management 2.0 — Product Service V2
 *
 * Full CRUD + search for the extended product catalog.
 * The existing product.service.ts is UNTOUCHED.
 *
 * Architecture:
 *   - All writes use service-role client
 *   - Reads use service-role client (bypasses RLS for consistent data)
 *   - No N+1: variants, images, tags fetched with separate but batched queries
 *   - Typed errors via ProductError
 *   - Uniqueness checks run BEFORE insert/update
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import { mapProductV2 } from '@/lib/product-mapper';
import { ProductError } from '@/lib/product-errors';
import { validateProductPayload, validateVariantPayload, validateVariantSkuUniqueness } from '@/lib/product-validation';
import type {
  ProductV2,
  ProductVariantV2,
  ProductImageV2,
  CreateProductV2Payload,
  UpdateProductV2Payload,
  CreateVariantPayload,
  UpdateVariantPayload,
  CreateImagePayload,
  ProductSearchFilters,
  ProductSearchResult,
  DbProductV2Row,
  DbProductVariant,
  DbProductImage,
  DbTag,
  DbCategory,
  DbSubcategory,
  DbCollection,
  DbAttributeOption,
  DbSizeChart,
} from '@/types/product-v2';
import { mapVariant, mapProductImage } from '@/lib/product-mapper';

// ============================================================
// SELECT CLAUSE (all product columns needed by mapper)
// ============================================================

const PRODUCT_V2_SELECT = `
  id, name, sku, slug, category, collection, brand, fabric, color, sizes,
  price, compare_price, cost, stock, hsn, gst, description, seo_title,
  seo_description, featured, new_arrival, best_seller, active, images,
  created_at, updated_at,
  category_id, subcategory_id, collection_id, size_chart_id,
  attr_fabric_id, attr_color_id, attr_occasion_id, attr_pattern_id,
  attr_fit_id, attr_sleeve_id, attr_neck_id, attr_work_id, attr_length_id,
  short_description, brand_name, display_order, seo_keywords, canonical_url,
  hsn_code, country_of_origin, manufacturer, care_instructions,
  pattern_text, occasion_text, work_type, fit, sleeve, neck, length_type,
  transparency, package_contents, published_at, published_by,
  created_by, updated_by
`.trim();

// ============================================================
// PRIVATE HELPERS
// ============================================================

/** Fetch variants, images, tags for a set of product IDs in parallel (no N+1). */
async function fetchRelations(productIds: number[]) {
  if (productIds.length === 0)
    return { variantsByProduct: {}, imagesByProduct: {}, tagsByProduct: {} };

  const sb = createServiceRoleClient();

  const [variantsRes, imagesRes, tagsRes] = await Promise.all([
    sb
      .from('product_variants')
      .select('*')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true }),
    sb
      .from('product_images')
      .select('*')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true }),
    sb
      .from('product_tags')
      .select('product_id, tags(id, name, slug)')
      .in('product_id', productIds),
  ]);

  if (variantsRes.error) throw new ProductError(variantsRes.error.message, 'INTERNAL');
  if (imagesRes.error) throw new ProductError(imagesRes.error.message, 'INTERNAL');
  if (tagsRes.error) throw new ProductError(tagsRes.error.message, 'INTERNAL');

  // Group by product_id
  const variantsByProduct: Record<number, DbProductVariant[]> = {};
  for (const v of (variantsRes.data ?? []) as DbProductVariant[]) {
    if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
    variantsByProduct[v.product_id]!.push(v);
  }

  const imagesByProduct: Record<number, DbProductImage[]> = {};
  for (const img of (imagesRes.data ?? []) as DbProductImage[]) {
    if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = [];
    imagesByProduct[img.product_id]!.push(img);
  }

  const tagsByProduct: Record<number, DbTag[]> = {};
  for (const row of tagsRes.data ?? []) {
    const pid = (row as { product_id: number }).product_id;
    const tag = (row as { tags: DbTag | null }).tags;
    if (!tagsByProduct[pid]) tagsByProduct[pid] = [];
    if (tag) tagsByProduct[pid]!.push(tag);
  }

  return { variantsByProduct, imagesByProduct, tagsByProduct };
}

/** Assemble a full ProductV2 with all relations. */
async function assembleProduct(
  row: DbProductV2Row,
  options?: {
    variants?: DbProductVariant[];
    images?: DbProductImage[];
    tags?: DbTag[];
    withAttributes?: boolean;
  }
): Promise<ProductV2> {
  // Fetch attribute rows if needed
  let attributeMap: Parameters<typeof mapProductV2>[1] extends { attributeMap?: infer A } ? A : never = undefined;

  if (options?.withAttributes) {
    const sb = createServiceRoleClient();
    const attrFetches: Promise<DbAttributeOption | null>[] = [
      row.attr_fabric_id   ? sb.from('attr_fabric').select('id,name,slug,display_order,active').eq('id', row.attr_fabric_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
      row.attr_color_id    ? sb.from('attr_color').select('id,name,slug,display_order,active,hex').eq('id', row.attr_color_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)    : Promise.resolve(null),
      row.attr_occasion_id ? sb.from('attr_occasion').select('id,name,slug,display_order,active').eq('id', row.attr_occasion_id).maybeSingle().then((r) => r.data as DbAttributeOption | null) : Promise.resolve(null),
      row.attr_pattern_id  ? sb.from('attr_pattern').select('id,name,slug,display_order,active').eq('id', row.attr_pattern_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)  : Promise.resolve(null),
      row.attr_fit_id      ? sb.from('attr_fit').select('id,name,slug,display_order,active').eq('id', row.attr_fit_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)      : Promise.resolve(null),
      row.attr_sleeve_id   ? sb.from('attr_sleeve').select('id,name,slug,display_order,active').eq('id', row.attr_sleeve_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
      row.attr_neck_id     ? sb.from('attr_neck').select('id,name,slug,display_order,active').eq('id', row.attr_neck_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)     : Promise.resolve(null),
      row.attr_work_id     ? sb.from('attr_work').select('id,name,slug,display_order,active').eq('id', row.attr_work_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)     : Promise.resolve(null),
      row.attr_length_id   ? sb.from('attr_length').select('id,name,slug,display_order,active').eq('id', row.attr_length_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
    ];
    const [fabric, color, occasion, pattern, fit, sleeve, neck, work, length] =
      await Promise.all(attrFetches);
    attributeMap = { fabric, color, occasion, pattern, fit, sleeve, neck, work, length };
  }

  // Fetch category / subcategory / collection refs if FKs are set
  const sb = createServiceRoleClient();
  const [catRes, subRes, colRes, szRes] = await Promise.all([
    row.category_id
      ? sb.from('categories').select('id,name,slug,description,display_order,active,created_at,updated_at').eq('id', row.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.subcategory_id
      ? sb.from('subcategories').