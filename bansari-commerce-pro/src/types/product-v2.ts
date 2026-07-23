/**
 * Product Management 2.0 — Domain Models
 *
 * All types are NEW. Existing Product interface in product.ts is untouched.
 * These types map directly to the tables created in migration
 * 20260718100000_product_management_v2_foundation.sql
 */

// ============================================================
// DB ROW TYPES (mirror Supabase columns exactly)
// ============================================================

export interface DbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSubcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCollection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTag {
  id: number;
  name: string;
  slug: string;
}

export interface DbSizeMaster {
  id: number;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface DbSizeChart {
  id: number;
  name: string;
  description: string | null;
  chart_data: SizeChartRow[];
  created_at: string;
  updated_at: string;
}

export interface DbAttributeOption {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  active: boolean;
  hex?: string; // only on attr_color
}

export type DbAttrTable =
  | 'attr_fabric'
  | 'attr_color'
  | 'attr_occasion'
  | 'attr_pattern'
  | 'attr_fit'
  | 'attr_sleeve'
  | 'attr_neck'
  | 'attr_work'
  | 'attr_length';

export type VariantStatus = 'active' | 'inactive' | 'out_of_stock';
export type ProductImageType = 'primary' | 'gallery' | 'zoom';

export interface DbProductVariant {
  id: number;
  product_id: number;
  size_id: number | null;
  size_label: string | null;
  sku: string;
  barcode: string | null;
  mrp: number;
  selling_price: number;
  cost: number | null;
  stock: number;
  reserved_stock: number;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  status: VariantStatus;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProductImage {
  id: number;
  product_id: number;
  image_type: ProductImageType;
  url: string;
  alt: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbProductTag {
  product_id: number;
  tag_id: number;
}

export interface DbProductAuditLog {
  id: number;
  product_id: number | null;
  actor_id: string | null;
  event: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DbProductV2Row {
  id: number;
  name: string;
  sku: string;
  slug: string;
  category: string;
  collection: string;
  brand: string;
  fabric: string;
  color: string;
  sizes: string[];
  price: number;
  compare_price: number | null;
  cost: number | null;
  stock: number;
  hsn: string;
  gst: number;
  description: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  active: boolean;
  images: { url?: string; alt?: string; type?: string }[];
  created_at: string;
  updated_at: string;
  // V2 columns (nullable — may be null for legacy rows)
  category_id: number | null;
  subcategory_id: number | null;
  collection_id: number | null;
  size_chart_id: number | null;
  attr_fabric_id: number | null;
  attr_color_id: number | null;
  attr_occasion_id: number | null;
  attr_pattern_id: number | null;
  attr_fit_id: number | null;
  attr_sleeve_id: number | null;
  attr_neck_id: number | null;
  attr_work_id: number | null;
  attr_length_id: number | null;
  short_description: string | null;
  brand_name: string | null;
  display_order: number;
  seo_keywords: string | null;
  canonical_url: string | null;
  hsn_code: string | null;
  country_of_origin: string;
  manufacturer: string | null;
  care_instructions: string | null;
  pattern_text: string | null;
  occasion_text: string | null;
  work_type: string | null;
  fit: string | null;
  sleeve: string | null;
  neck: string | null;
  length_type: string | null;
  transparency: string | null;
  package_contents: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  updated_by: string | null;
}

// ============================================================
// DOMAIN MODELS
// ============================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface SizeEntry {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface SizeChartRow {
  size: string;
  [measurement: string]: string | number;
}

export interface SizeChart {
  id: number;
  name: string;
  description: string | null;
  chartData: SizeChartRow[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeOption {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  hex?: string;
}

export interface ProductAttributes {
  fabric: AttributeOption | null;
  color: AttributeOption | null;
  occasion: AttributeOption | null;
  pattern: AttributeOption | null;
  fit: AttributeOption | null;
  sleeve: AttributeOption | null;
  neck: AttributeOption | null;
  work: AttributeOption | null;
  length: AttributeOption | null;
}

export interface ProductVariantV2 {
  id: number;
  productId: number;
  sizeId: number | null;
  sizeLabel: string | null;
  sku: string;
  barcode: string | null;
  mrp: number;
  sellingPrice: number;
  cost: number | null;
  stock: number;
  reservedStock: number;
  availableStock: number; // derived: stock - reservedStock
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  status: VariantStatus;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageV2 {
  id: number;
  productId: number;
  imageType: ProductImageType;
  url: string;
  alt: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductAuditLog {
  id: number;
  productId: number | null;
  actorId: string | null;
  event: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface InventorySummary {
  totalStock: number;
  totalReserved: number;
  availableStock: number;
  variantCount: number;
  activeVariants: number;
  outOfStockVariants: number;
}

export interface ProductV2 {
  // Core identity
  id: number;
  name: string;
  slug: string;
  sku: string;

  // Descriptions
  shortDescription: string | null;
  description: string;

  // Brand
  brand: string;
  brandName: string | null;

  // Categorisation (legacy text + normalized FK)
  category: string;
  categoryId: number | null;
  subcategoryId: number | null;
  collectionId: number | null;

  // Pricing (legacy flat price; V2 variants hold per-variant pricing)
  price: number;
  comparePrice: number | null;
  cost: number | null;
  gst: number;

  // Inventory (legacy flat stock; V2 variants hold per-variant stock)
  stock: number;

  // Flags
  active: boolean;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  displayOrder: number;

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string | null;
  canonicalUrl: string | null;

  // Compliance
  hsn: string;
  hsnCode: string | null;
  gstRate: number;
  countryOfOrigin: string;
  manufacturer: string | null;

  // Apparel attributes (text fallbacks)
  fabric: string;
  color: string;
  careInstructions: string | null;
  patternText: string | null;
  occasionText: string | null;
  workType: string | null;
  fit: string | null;
  sleeve: string | null;
  neck: string | null;
  lengthType: string | null;
  transparency: string | null;
  packageContents: string | null;

  // Apparel attribute FKs (normalized)
  attrFabricId: number | null;
  attrColorId: number | null;
  attrOccasionId: number | null;
  attrPatternId: number | null;
  attrFitId: number | null;
  attrSleeveId: number | null;
  attrNeckId: number | null;
  attrWorkId: number | null;
  attrLengthId: number | null;

  // Size chart
  sizeChartId: number | null;

  // Legacy images (JSONB column)
  images: { url?: string; alt?: string; type?: string }[];

  // Audit
  publishedAt: string | null;
  publishedBy: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined relations (populated by repository when requested)
  variants?: ProductVariantV2[];
  productImages?: ProductImageV2[];
  tags?: Tag[];
  categoryRef?: Category | null;
  subcategoryRef?: Subcategory | null;
  collectionRef?: Collection | null;
  attributes?: ProductAttributes;
  sizeChart?: SizeChart | null;
  inventorySummary?: InventorySummary;
}

// ============================================================
// INSERT / UPDATE PAYLOADS
// ============================================================

export type CreateProductV2Payload = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description?: string;
  brand?: string;
  brand_name?: string;
  category: string;
  category_id?: number;
  subcategory_id?: number;
  collection?: string;
  collection_id?: number;
  price: number;
  compare_price?: number;
  cost?: number;
  stock?: number;
  hsn: string;
  hsn_code?: string;
  gst: number;
  country_of_origin?: string;
  manufacturer?: string;
  care_instructions?: string;
  fabric?: string;
  color?: string;
  sizes?: string[];
  pattern_text?: string;
  occasion_text?: string;
  work_type?: string;
  fit?: string;
  sleeve?: string;
  neck?: string;
  length_type?: string;
  transparency?: string;
  package_contents?: string;
  attr_fabric_id?: number;
  attr_color_id?: number;
  attr_occasion_id?: number;
  attr_pattern_id?: number;
  attr_fit_id?: number;
  attr_sleeve_id?: number;
  attr_neck_id?: number;
  attr_work_id?: number;
  attr_length_id?: number;
  size_chart_id?: number;
  featured?: boolean;
  new_arrival?: boolean;
  best_seller?: boolean;
  active?: boolean;
  display_order?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  images?: { url?: string; alt?: string; type?: string }[];
  tag_ids?: number[];
  created_by?: string;
  updated_by?: string;
};

export type UpdateProductV2Payload = Partial<CreateProductV2Payload> & {
  updated_by?: string;
};

// ============================================================
// VARIANT PAYLOADS
// ============================================================

export type CreateVariantPayload = {
  product_id: number;
  size_id?: number;
  size_label?: string;
  sku: string;
  barcode?: string;
  mrp: number;
  selling_price: number;
  cost?: number;
  stock?: number;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  status?: VariantStatus;
  is_default?: boolean;
  sort_order?: number;
};

export type UpdateVariantPayload = Partial<Omit<CreateVariantPayload, 'product_id'>>;

// ============================================================
// QUERY / FILTER TYPES
// ============================================================

export interface ProductV2Filters {
  search?: string;
  categoryId?: number;
  subcategoryId?: number;
  collectionId?: number;
  active?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  attrFabricId?: number;
  attrColorId?: number;
  attrOccasionId?: number;
  attrPatternId?: number;
  attrFitId?: number;
  attrSleeveId?: number;
  attrNeckId?: number;
  attrWorkId?: number;
  attrLengthId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'price' | 'created_at' | 'display_order' | 'stock';
  sortDir?: 'asc' | 'desc';
}

export interface ProductV2ListResult {
  data: ProductV2[];
  total: number;
  page: number;
  pageSize: number;
}
