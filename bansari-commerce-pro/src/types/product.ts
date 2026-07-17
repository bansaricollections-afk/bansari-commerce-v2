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
  specifications?: ProductSpecification;
  description?: string;
  seo?: ProductSEO;
  reviews?: ProductReview[];
  relatedProducts?: number[];
  completeLook?: number[];
  createdAt?: string;
  updatedAt?: string;
}