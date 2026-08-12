export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  type:
    | "front"
    | "back"
    | "side"
    | "detail"
    | "neckline"
    | "sleeve"
    | "fabric"
    | "lifestyle";
  // ── V2 media fields (optional — absent on legacy JSONB images) ────────────
  /** Render branch: "image" (default) or "video". */
  mediaType?: "image" | "video";
  /** High-resolution URL for desktop zoom panel; falls back to `url` when absent. */
  hiResUrl?: string;
  /** Editorial or fabric caption; rendered in lightbox and Fabric gallery tab. */
  caption?: string;
  /** Explicit sort position; replaces array-index dependency in V2 source. */
  sortOrder?: number;
};

export type ProductVariant = {
  id: string;
  color: string;
  colorCode: string;
  size?: string;  // Flat size property for backward compatibility
  sizes?: ProductSize[];  // Array of sizes
  stock?: number;  // Stock at variant level
  images?: ProductImage[];
};

export type ProductSize = {
  size: string;
  stock: number;
  sku: string;
};

// ── Size-level inventory ────────────────────────────────────────────────────
// Derived server-side by size-inventory.service; never computed in the UI.

export type SizeStatus = "AVAILABLE" | "LOW_STOCK" | "ONLY_ONE_LEFT" | "SOLD_OUT";

export type SizeSemantic = "REGULAR" | "PLUS" | "FREE_SIZE" | "UNCLASSIFIED";

/** One purchasable size of a product, with its own independent inventory. */
export type SizeAvailability = {
  variantId: number;
  sizeId: number;
  label: string;
  sortOrder: number;
  semantic: SizeSemantic;
  sku: string;
  /** stock - reserved_stock, clamped at 0. Used to cap the quantity selector. */
  available: number;
  status: SizeStatus;
};

export type ProductReview = {
  id: string;
  customerName: string;
  rating: number;
  title: string;
  review: string;
  verified: boolean;
  createdAt: string;
};

export type ProductSpecification = {
  fabric: string;
  work: string;
  neckline: string;
  sleeve: string;
  fit: string;
  occasion: string[];
  care: string;
  /** Free-text model info shown on PDP. e.g. "Model is 5'7\", Measurements: 34-26-36" */
  modelInfo?: string;
  /** Size worn by the model shown on PDP. e.g. "S" */
  sizeWorn?: string;
};

export type ProductSEO = {
  title: string;
  description: string;
  keywords: string[];
};

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock?: number;
  active?: boolean;
  images?: (ProductImage | { url?: string; alt?: string; type?: string })[];
  category?: string;

  sku?: string;
  styleCode?: string;
  shortName?: string;
  subCategory?: string;
  collection?: string;
  badge?: string;
  oldPrice?: number;
  discount?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  variants?: ProductVariant[];
  /**
   * Size-level availability. Present (non-empty) only for size-managed
   * products — i.e. products that have at least one live product_variants row.
   * When absent, the legacy product-level `stock` path applies unchanged.
   */
  sizeAvailability?: SizeAvailability[];
  specifications?: ProductSpecification;
  description?: string;
  seo?: ProductSEO;
  reviews?: ProductReview[];
  relatedProducts?: number[];
  completeLook?: number[];
  createdAt?: string;
  updatedAt?: string;
}
