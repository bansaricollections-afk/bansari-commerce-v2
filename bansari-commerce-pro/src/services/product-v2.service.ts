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
import { mapProductV2, mapVariant, mapProductImage } from '@/lib/product-mapper';
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
  const sb = createServiceRoleClient();

  // Fetch attribute rows if needed
  let attributeMap: Parameters<typeof mapProductV2>[1] extends { attributeMap?: infer A } ? A : never = undefined;

  if (options?.withAttributes) {
    const attrFetches: Promise<DbAttributeOption | null>[] = [
      row.attr_fabric_id   ? sb.from('attr_fabric').select('id,name,slug,display_order,active').eq('id', row.attr_fabric_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
      row.attr_color_id    ? sb.from('attr_color').select('id,name,slug,display_order,active,hex').eq('id', row.attr_color_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)    : Promise.resolve(null),
      row.attr_occasion_id ? sb.from('attr_occasion').select('id,name,slug,display_order,active').eq('id', row.attr_occasion_id).maybeSingle().then((r) => r.data as DbAttributeOption | null) : Promise.resolve(null),
      row.attr_pattern_id  ? sb.from('attr_pattern').select('id,name,slug,display_order,active').eq('id', row.attr_pattern_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)  : Promise.resolve(null),
      row.attr_fit_id      ? sb.from('attr_fit').select('id,name,slug,display_order,active').eq('id', row.attr_fit_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)          : Promise.resolve(null),
      row.attr_sleeve_id   ? sb.from('attr_sleeve').select('id,name,slug,display_order,active').eq('id', row.attr_sleeve_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
      row.attr_neck_id     ? sb.from('attr_neck').select('id,name,slug,display_order,active').eq('id', row.attr_neck_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)        : Promise.resolve(null),
      row.attr_work_id     ? sb.from('attr_work').select('id,name,slug,display_order,active').eq('id', row.attr_work_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)        : Promise.resolve(null),
      row.attr_length_id   ? sb.from('attr_length').select('id,name,slug,display_order,active').eq('id', row.attr_length_id).maybeSingle().then((r) => r.data as DbAttributeOption | null)   : Promise.resolve(null),
    ];
    const [fabric, color, occasion, pattern, fit, sleeve, neck, work, length] = await Promise.all(attrFetches);
    attributeMap = { fabric, color, occasion, pattern, fit, sleeve, neck, work, length };
  }

  // Fetch category / subcategory / collection / size-chart refs in parallel
  const [catRes, subRes, colRes, szRes] = await Promise.all([
    row.category_id
      ? sb.from('categories').select('id,name,slug,description,display_order,active,created_at,updated_at').eq('id', row.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.subcategory_id
      ? sb.from('subcategories').select('id,category_id,name,slug,description,display_order,active,created_at,updated_at').eq('id', row.subcategory_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.collection_id
      ? sb.from('collections').select('id,name,slug,description,banner_url,display_order,active,created_at,updated_at').eq('id', row.collection_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.size_chart_id
      ? sb.from('size_charts').select('id,name,description,chart_data,created_at,updated_at').eq('id', row.size_chart_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (catRes.error) throw new ProductError(catRes.error.message, 'INTERNAL');
  if (subRes.error) throw new ProductError(subRes.error.message, 'INTERNAL');
  if (colRes.error) throw new ProductError(colRes.error.message, 'INTERNAL');
  if (szRes.error)  throw new ProductError(szRes.error.message,  'INTERNAL');

  return mapProductV2(row, {
    variants:      options?.variants,
    images:        options?.images,
    tags:          options?.tags,
    attributeMap,
    categoryRef:   catRes.data as DbCategory | null,
    subcategoryRef: subRes.data as DbSubcategory | null,
    collectionRef: colRes.data as DbCollection | null,
    sizeChart:     szRes.data as DbSizeChart | null,
  });
}

// ============================================================
// PUBLIC SERVICE
// ============================================================

export const ProductV2Service = {
  // ─────────────────────────────────────────────────────────
  // SEARCH / LIST
  // ─────────────────────────────────────────────────────────

  /**
   * Paginated product search supporting all admin filters.
   * Returns { data, total, page, pageSize } to match the API route contract.
   */
  async search(filters: ProductSearchFilters & {
    q?: string;
    minStock?: number;
    maxStock?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }): Promise<{ data: ProductV2[]; total: number; page: number; pageSize: number }> {
    const sb = createServiceRoleClient();

    const page     = Math.max(0, filters.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const sortBy   = filters.sortBy  ?? 'created_at';
    const sortDir  = filters.sortDir ?? 'desc';
    const from     = page * pageSize;
    const to       = from + pageSize - 1;

    let query = sb
      .from('products')
      .select(PRODUCT_V2_SELECT, { count: 'exact' })
      .range(from, to)
      .order(sortBy, { ascending: sortDir === 'asc' });

    // Text search
    if (filters.q) {
      query = query.or(
        `name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,slug.ilike.%${filters.q}%,description.ilike.%${filters.q}%`
      );
    }
    // Category filter (text OR FK)
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.categorySlug) {
      const { data: cat } = await sb.from('categories').select('id').eq('slug', filters.categorySlug).maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }
    // Collection
    if (filters.collection) query = query.eq('collection', filters.collection);
    if (filters.collectionId) query = query.eq('collection_id', filters.collectionId);
    // Booleans
    if (filters.featured   !== undefined) query = query.eq('featured',    filters.featured);
    if (filters.newArrival !== undefined) query = query.eq('new_arrival', filters.newArrival);
    if (filters.bestSeller !== undefined) query = query.eq('best_seller', filters.bestSeller);
    if (filters.active     !== undefined) query = query.eq('active',      filters.active);
    // Price
    if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
    // Stock
    if (filters.minStock !== undefined) query = query.gte('stock', filters.minStock);
    if (filters.maxStock !== undefined) query = query.lte('stock', filters.maxStock);

    const { data, error, count } = await query;
    if (error) throw new ProductError(error.message, 'INTERNAL');

    const rows = (data ?? []) as DbProductV2Row[];
    const ids  = rows.map((r) => r.id);
    const { variantsByProduct, imagesByProduct, tagsByProduct } = await fetchRelations(ids);

    const products = await Promise.all(
      rows.map((row) =>
        assembleProduct(row, {
          variants: variantsByProduct[row.id] ?? [],
          images:   imagesByProduct[row.id]   ?? [],
          tags:     tagsByProduct[row.id]     ?? [],
        })
      )
    );

    return { data: products, total: count ?? 0, page, pageSize };
  },

  // ─────────────────────────────────────────────────────────
  // GET BY ID
  // ─────────────────────────────────────────────────────────

  async getById(
    id: number,
    options?: { withAttributes?: boolean }
  ): Promise<ProductV2 | null> {
    const sb = createServiceRoleClient();

    const { data, error } = await sb
      .from('products')
      .select(PRODUCT_V2_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new ProductError(error.message, 'INTERNAL');
    if (!data) return null;

    const row = data as DbProductV2Row;
    const { variantsByProduct, imagesByProduct, tagsByProduct } = await fetchRelations([row.id]);

    return assembleProduct(row, {
      variants:       variantsByProduct[row.id] ?? [],
      images:         imagesByProduct[row.id]   ?? [],
      tags:           tagsByProduct[row.id]     ?? [],
      withAttributes: options?.withAttributes,
    });
  },

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────

  async create(payload: CreateProductV2Payload): Promise<ProductV2> {
    const sb = createServiceRoleClient();

    // Validate
    const validationErrors = validateProductPayload(payload);
    if (validationErrors.length > 0) {
      throw new ProductError(validationErrors[0]!.message, 'VALIDATION');
    }

    // Uniqueness checks
    const [skuCheck, slugCheck] = await Promise.all([
      sb.from('products').select('id').eq('sku', payload.sku).maybeSingle(),
      sb.from('products').select('id').eq('slug', payload.slug).maybeSingle(),
    ]);
    if (skuCheck.data)  throw new ProductError(`SKU "${payload.sku}" already exists.`,   'DUPLICATE_SKU');
    if (slugCheck.data) throw new ProductError(`Slug "${payload.slug}" already exists.`, 'DUPLICATE_SLUG');

    const now = new Date().toISOString();

    const insertRow: Record<string, unknown> = {
      name:               payload.name,
      slug:               payload.slug,
      sku:                payload.sku,
      description:        payload.description,
      short_description:  payload.short_description    ?? null,
      brand:              payload.brand                ?? 'Bansari Collections',
      brand_name:         payload.brand_name           ?? null,
      category:           payload.category,
      category_id:        payload.category_id          ?? null,
      subcategory_id:     payload.subcategory_id       ?? null,
      collection:         payload.collection           ?? '',
      collection_id:      payload.collection_id        ?? null,
      price:              payload.price,
      compare_price:      payload.compare_price        ?? null,
      cost:               payload.cost                 ?? null,
      hsn:                payload.hsn,
      hsn_code:           payload.hsn_code             ?? null,
      gst:                payload.gst,
      country_of_origin:  payload.country_of_origin    ?? 'India',
      manufacturer:       payload.manufacturer         ?? null,
      care_instructions:  payload.care_instructions    ?? null,
      fabric:             payload.fabric,
      color:              payload.color,
      sizes:              payload.sizes                ?? [],
      images:             payload.images               ?? [],
      pattern_text:       payload.pattern_text         ?? null,
      occasion_text:      payload.occasion_text        ?? null,
      work_type:          payload.work_type            ?? null,
      fit:                payload.fit                  ?? null,
      sleeve:             payload.sleeve               ?? null,
      neck:               payload.neck                 ?? null,
      length_type:        payload.length_type          ?? null,
      transparency:       payload.transparency         ?? null,
      package_contents:   payload.package_contents     ?? null,
      attr_fabric_id:     payload.attr_fabric_id       ?? null,
      attr_color_id:      payload.attr_color_id        ?? null,
      attr_occasion_id:   payload.attr_occasion_id     ?? null,
      attr_pattern_id:    payload.attr_pattern_id      ?? null,
      attr_fit_id:        payload.attr_fit_id          ?? null,
      attr_sleeve_id:     payload.attr_sleeve_id       ?? null,
      attr_neck_id:       payload.attr_neck_id         ?? null,
      attr_work_id:       payload.attr_work_id         ?? null,
      attr_length_id:     payload.attr_length_id       ?? null,
      size_chart_id:      payload.size_chart_id        ?? null,
      seo_title:          payload.seo_title,
      seo_description:    payload.seo_description,
      seo_keywords:       payload.seo_keywords         ?? null,
      canonical_url:      payload.canonical_url        ?? null,
      featured:           payload.featured             ?? false,
      new_arrival:        payload.new_arrival          ?? false,
      best_seller:        payload.best_seller          ?? false,
      active:             payload.active               ?? true,
      display_order:      payload.display_order        ?? 0,
      stock:              0,
      created_by:         payload.created_by           ?? null,
      updated_by:         payload.created_by           ?? null,
      created_at:         now,
      updated_at:         now,
    };

    const { data, error } = await sb
      .from('products')
      .insert(insertRow)
      .select(PRODUCT_V2_SELECT)
      .single();

    if (error) throw new ProductError(error.message, 'INTERNAL');

    const row = data as DbProductV2Row;
    return assembleProduct(row, { variants: [], images: [], tags: [] });
  },

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────

  async update(id: number, payload: UpdateProductV2Payload): Promise<ProductV2> {
    const sb = createServiceRoleClient();

    // Check product exists
    const { data: existing } = await sb.from('products').select('id,sku,slug').eq('id', id).maybeSingle();
    if (!existing) throw new ProductError(`Product ${id} not found.`, 'NOT_FOUND');

    // Uniqueness checks (only if changing sku / slug)
    if (payload.sku && payload.sku !== (existing as { sku: string }).sku) {
      const { data: dup } = await sb.from('products').select('id').eq('sku', payload.sku).neq('id', id).maybeSingle();
      if (dup) throw new ProductError(`SKU "${payload.sku}" already exists.`, 'DUPLICATE_SKU');
    }
    if (payload.slug && payload.slug !== (existing as { slug: string }).slug) {
      const { data: dup } = await sb.from('products').select('id').eq('slug', payload.slug).neq('id', id).maybeSingle();
      if (dup) throw new ProductError(`Slug "${payload.slug}" already exists.`, 'DUPLICATE_SLUG');
    }

    // Build update object — only include fields present in payload
    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const map: Record<string, string> = {
      name: 'name', slug: 'slug', sku: 'sku', description: 'description',
      short_description: 'short_description', brand: 'brand', brand_name: 'brand_name',
      category: 'category', category_id: 'category_id', subcategory_id: 'subcategory_id',
      collection: 'collection', collection_id: 'collection_id',
      price: 'price', compare_price: 'compare_price', cost: 'cost',
      hsn: 'hsn', hsn_code: 'hsn_code', gst: 'gst',
      country_of_origin: 'country_of_origin', manufacturer: 'manufacturer',
      care_instructions: 'care_instructions', fabric: 'fabric', color: 'color',
      sizes: 'sizes', images: 'images',
      pattern_text: 'pattern_text', occasion_text: 'occasion_text', work_type: 'work_type',
      fit: 'fit', sleeve: 'sleeve', neck: 'neck', length_type: 'length_type',
      transparency: 'transparency', package_contents: 'package_contents',
      attr_fabric_id: 'attr_fabric_id', attr_color_id: 'attr_color_id',
      attr_occasion_id: 'attr_occasion_id', attr_pattern_id: 'attr_pattern_id',
      attr_fit_id: 'attr_fit_id', attr_sleeve_id: 'attr_sleeve_id',
      attr_neck_id: 'attr_neck_id', attr_work_id: 'attr_work_id',
      attr_length_id: 'attr_length_id', size_chart_id: 'size_chart_id',
      seo_title: 'seo_title', seo_description: 'seo_description',
      seo_keywords: 'seo_keywords', canonical_url: 'canonical_url',
      featured: 'featured', new_arrival: 'new_arrival', best_seller: 'best_seller',
      active: 'active', display_order: 'display_order',
      updated_by: 'updated_by',
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in payload) updateRow[col] = (payload as Record<string, unknown>)[key];
    }

    const { data, error } = await sb
      .from('products')
      .update(updateRow)
      .eq('id', id)
      .select(PRODUCT_V2_SELECT)
      .single();

    if (error) throw new ProductError(error.message, 'INTERNAL');

    const row = data as DbProductV2Row;
    const { variantsByProduct, imagesByProduct, tagsByProduct } = await fetchRelations([row.id]);
    return assembleProduct(row, {
      variants: variantsByProduct[row.id] ?? [],
      images:   imagesByProduct[row.id]   ?? [],
      tags:     tagsByProduct[row.id]     ?? [],
    });
  },

  // ─────────────────────────────────────────────────────────
  // VARIANTS
  // ─────────────────────────────────────────────────────────

  async addVariant(payload: CreateVariantPayload): Promise<ProductVariantV2> {
    const sb = createServiceRoleClient();

    const errors = validateVariantPayload(payload);
    if (errors.length > 0) throw new ProductError(errors[0]!.message, 'VALIDATION');

    // Variant SKU uniqueness
    const dupError = await validateVariantSkuUniqueness(payload.sku);
    if (dupError) throw new ProductError(dupError, 'DUPLICATE_SKU');

    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('product_variants')
      .insert({
        product_id:     payload.product_id,
        size_id:        payload.size_id        ?? null,
        size_label:     payload.size_label     ?? null,
        sku:            payload.sku,
        barcode:        payload.barcode        ?? null,
        mrp:            payload.mrp,
        selling_price:  payload.selling_price,
        cost:           payload.cost           ?? null,
        stock:          payload.stock,
        reserved_stock: payload.reserved_stock ?? 0,
        weight_grams:   payload.weight_grams   ?? null,
        length_cm:      payload.length_cm      ?? null,
        width_cm:       payload.width_cm       ?? null,
        height_cm:      payload.height_cm      ?? null,
        status:         payload.status         ?? 'active',
        is_default:     payload.is_default     ?? false,
        sort_order:     payload.sort_order     ?? 0,
        created_at:     now,
        updated_at:     now,
      })
      .select('*')
      .single();

    if (error) throw new ProductError(error.message, 'INTERNAL');
    return mapVariant(data as DbProductVariant);
  },

  async updateVariant(variantId: number, payload: UpdateVariantPayload): Promise<ProductVariantV2> {
    const sb = createServiceRoleClient();

    if (payload.sku) {
      const dupError = await validateVariantSkuUniqueness(payload.sku, variantId);
      if (dupError) throw new ProductError(dupError, 'DUPLICATE_SKU');
    }

    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = [
      'size_id', 'size_label', 'sku', 'barcode', 'mrp', 'selling_price',
      'cost', 'stock', 'reserved_stock', 'weight_grams', 'length_cm',
      'width_cm', 'height_cm', 'status', 'is_default', 'sort_order',
    ];
    for (const f of fields) {
      if (f in payload) updateRow[f] = (payload as Record<string, unknown>)[f];
    }

    const { data, error } = await sb
      .from('product_variants')
      .update(updateRow)
      .eq('id', variantId)
      .select('*')
      .single();

    if (error) throw new ProductError(error.message, 'INTERNAL');
    return mapVariant(data as DbProductVariant);
  },

  async deleteVariant(variantId: number): Promise<void> {
    const sb = createServiceRoleClient();
    const { error } = await sb.from('product_variants').delete().eq('id', variantId);
    if (error) throw new ProductError(error.message, 'INTERNAL');
  },

  // ─────────────────────────────────────────────────────────
  // IMAGES
  // ─────────────────────────────────────────────────────────

  async addImage(payload: CreateImagePayload): Promise<ProductImageV2> {
    const sb = createServiceRoleClient();

    const { data, error } = await sb
      .from('product_images')
      .insert({
        product_id:  payload.product_id,
        image_type:  payload.image_type,
        url:         payload.url,
        alt:         payload.alt         ?? null,
        sort_order:  payload.sort_order  ?? 0,
        created_at:  new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new ProductError(error.message, 'INTERNAL');
    return mapProductImage(data as DbProductImage);
  },

  async deleteImage(imageId: number): Promise<void> {
    const sb = createServiceRoleClient();
    const { error } = await sb.from('product_images').delete().eq('id', imageId);
    if (error) throw new ProductError(error.message, 'INTERNAL');
  },

  // ─────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────

  async addTag(productId: number, tagId: number): Promise<void> {
    const sb = createServiceRoleClient();
    // Upsert — safe to call even if already linked
    const { error } = await sb
      .from('product_tags')
      .upsert({ product_id: productId, tag_id: tagId }, { onConflict: 'product_id,tag_id' });
    if (error) throw new ProductError(error.message, 'INTERNAL');
  },

  async removeTag(productId: number, tagId: number): Promise<void> {
    const sb = createServiceRoleClient();
    const { error } = await sb
      .from('product_tags')
      .delete()
      .eq('product_id', productId)
      .eq('tag_id', tagId);
    if (error) throw new ProductError(error.message, 'INTERNAL');
  },
};
