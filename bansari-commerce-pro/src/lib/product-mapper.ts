/**
 * Product Management 2.0 — DB Row → Domain → API Mapper
 *
 * Maps raw Supabase rows to strongly-typed domain models.
 * Existing mapRow() in product.service.ts is UNTOUCHED.
 */
import type {
  DbProductV2Row,
  DbProductVariant,
  DbProductImage,
  DbCategory,
  DbSubcategory,
  DbCollection,
  DbTag,
  DbAttributeOption,
  DbSizeMaster,
  DbSizeChart,
  ProductV2,
  ProductVariantV2,
  ProductImageV2,
  Category,
  Subcategory,
  Collection,
  Tag,
  SizeEntry,
  SizeChart,
  AttributeOption,
  ProductAttributes,
  InventorySummary,
} from '@/types/product-v2';
import { calculateInventory, sortImages } from '@/lib/product-helpers';

// ============================================================
// ATTRIBUTE OPTION
// ============================================================

export function mapAttributeOption(
  row: DbAttributeOption
): AttributeOption {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    displayOrder: row.display_order,
    active: row.active,
    ...(row.hex !== undefined ? { hex: row.hex } : {}),
  };
}

// ============================================================
// CATEGORY
// ============================================================

export function mapCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    displayOrder: row.display_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// SUBCATEGORY
// ============================================================

export function mapSubcategory(row: DbSubcategory): Subcategory {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    displayOrder: row.display_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// COLLECTION
// ============================================================

export function mapCollection(row: DbCollection): Collection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    bannerUrl: row.banner_url,
    displayOrder: row.display_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// TAG
// ============================================================

export function mapTag(row: DbTag): Tag {
  return { id: row.id, name: row.name, slug: row.slug };
}

// ============================================================
// SIZE
// ============================================================

export function mapSize(row: DbSizeMaster): SizeEntry {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

export function mapSizeChart(row: DbSizeChart): SizeChart {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    chartData: row.chart_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// VARIANT
// ============================================================

export function mapVariant(row: DbProductVariant): ProductVariantV2 {
  return {
    id: row.id,
    productId: row.product_id,
    sizeId: row.size_id,
    sizeLabel: row.size_label,
    sku: row.sku,
    barcode: row.barcode,
    mrp: Number(row.mrp),
    sellingPrice: Number(row.selling_price),
    cost: row.cost !== null ? Number(row.cost) : null,
    stock: row.stock,
    reservedStock: row.reserved_stock,
    availableStock: Math.max(0, row.stock - row.reserved_stock),
    weightGrams: row.weight_grams,
    lengthCm: row.length_cm !== null ? Number(row.length_cm) : null,
    widthCm: row.width_cm !== null ? Number(row.width_cm) : null,
    heightCm: row.height_cm !== null ? Number(row.height_cm) : null,
    status: row.status,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// PRODUCT IMAGE
// ============================================================

export function mapProductImage(row: DbProductImage): ProductImageV2 {
  return {
    id: row.id,
    productId: row.product_id,
    imageType: row.image_type,
    url: row.url,
    alt: row.alt,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// ============================================================
// PRODUCT V2 (full)
// ============================================================

export function mapProductV2(
  row: DbProductV2Row,
  options?: {
    variants?: DbProductVariant[];
    productImages?: DbProductImage[];
    tags?: DbTag[];
    categoryRef?: DbCategory | null;
    subcategoryRef?: DbSubcategory | null;
    collectionRef?: DbCollection | null;
    attributeMap?: Partial<{
      fabric: DbAttributeOption | null;
      color: DbAttributeOption | null;
      occasion: DbAttributeOption | null;
      pattern: DbAttributeOption | null;
      fit: DbAttributeOption | null;
      sleeve: DbAttributeOption | null;
      neck: DbAttributeOption | null;
      work: DbAttributeOption | null;
      length: DbAttributeOption | null;
    }>;
    sizeChart?: DbSizeChart | null;
  }
): ProductV2 {
  const mappedVariants = (options?.variants ?? []).map(mapVariant);
  const mappedImages = sortImages(
    (options?.productImages ?? []).map(mapProductImage)
  );

  const inventorySummary: InventorySummary =
    mappedVariants.length > 0
      ? calculateInventory(mappedVariants)
      : {
          totalStock: row.stock,
          totalReserved: 0,
          availableStock: row.stock,
          variantCount: 0,
          activeVariants: 0,
          outOfStockVariants: 0,
        };

  const am = options?.attributeMap ?? {};
  const attributes: ProductAttributes = {
    fabric: am.fabric ? mapAttributeOption(am.fabric) : null,
    color: am.color ? mapAttributeOption(am.color) : null,
    occasion: am.occasion ? mapAttributeOption(am.occasion) : null,
    pattern: am.pattern ? mapAttributeOption(am.pattern) : null,
    fit: am.fit ? mapAttributeOption(am.fit) : null,
    sleeve: am.sleeve ? mapAttributeOption(am.sleeve) : null,
    neck: am.neck ? mapAttributeOption(am.neck) : null,
    work: am.work ? mapAttributeOption(am.work) : null,
    length: am.length ? mapAttributeOption(am.length) : null,
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.short_description,
    description: row.description,
    brand: row.brand,
    brandName: row.brand_name,
    category: row.category,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    collectionId: row.collection_id,
    price: Number(row.price),
    comparePrice: row.compare_price !== null ? Number(row.compare_price) : null,
    cost: row.cost !== null ? Number(row.cost) : null,
    gst: Number(row.gst),
    stock: row.stock,
    active: row.active,
    featured: row.featured,
    newArrival: row.new_arrival,
    bestSeller: row.best_seller,
    displayOrder: row.display_order ?? 0,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    canonicalUrl: row.canonical_url,
    hsn: row.hsn,
    hsnCode: row.hsn_code,
    gstRate: Number(row.gst),
    countryOfOrigin: row.country_of_origin ?? 'India',
    manufacturer: row.manufacturer,
    fabric: row.fabric,
    color: row.color,
    careInstructions: row.care_instructions,
    patternText: row.pattern_text,
    occasionText: row.occasion_text,
    workType: row.work_type,
    fit: row.fit,
    sleeve: row.sleeve,
    neck: row.neck,
    lengthType: row.length_type,
    transparency: row.transparency,
    packageContents: row.package_contents,
    attrFabricId: row.attr_fabric_id,
    attrColorId: row.attr_color_id,
    attrOccasionId: row.attr_occasion_id,
    attrPatternId: row.attr_pattern_id,
    attrFitId: row.attr_fit_id,
    attrSleeveId: row.attr_sleeve_id,
    attrNeckId: row.attr_neck_id,
    attrWorkId: row.attr_work_id,
    attrLengthId: row.attr_length_id,
    sizeChartId: row.size_chart_id,
    images: Array.isArray(row.images) ? row.images : [],
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants: mappedVariants,
    productImages: mappedImages,
    tags: (options?.tags ?? []).map(mapTag),
    categoryRef: options?.categoryRef ? mapCategory(options.categoryRef) : null,
    subcategoryRef: options?.subcategoryRef
      ? mapSubcategory(options.subcategoryRef)
      : null,
    collectionRef: options?.collectionRef
      ? mapCollection(options.collectionRef)
      : null,
    attributes,
    sizeChart: options?.sizeChart ? mapSizeChart(options.sizeChart) : null,
    inventorySummary,
  };
}

// ============================================================
// STOREFRONT SHAPE (lightweight — for product cards/grids)
// ============================================================

export interface StorefrontProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  category: string;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  stock: number;
  discountPercent: number;
}

export function mapToStorefront(p: ProductV2): StorefrontProduct {
  const primaryImg =
    p.productImages?.find((img) => img.imageType === 'primary') ??
    p.productImages?.[0] ??
    null;

  // fallback to legacy JSONB images
  const legacyImg =
    !primaryImg && Array.isArray(p.images) && p.images.length > 0
      ? p.images[0]
      : null;

  const imageUrl = primaryImg?.url ?? legacyImg?.url ?? null;
  const imageAlt = primaryImg?.alt ?? legacyImg?.alt ?? p.name;

  const mrp = p.comparePrice ?? p.price;
  const discount =
    mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    primaryImageUrl: imageUrl ?? null,
    primaryImageAlt: typeof imageAlt === 'string' ? imageAlt : p.name,
    category: p.category,
    featured: p.featured,
    newArrival: p.newArrival,
    bestSeller: p.bestSeller,
    active: p.active,
    stock: p.inventorySummary?.availableStock ?? p.stock,
    discountPercent: discount,
  };
}
