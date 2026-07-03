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
  sizes: ProductSize[];
  images: ProductImage[];
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

  sku: string;
  styleCode: string;
  slug: string;

  name: string;
  shortName: string;

  category: string;
  subCategory: string;
  collection: string;

  badge?: string;

  price: number;
  oldPrice?: number;

  discount: number;

  currency: "INR";

  rating: number;
  reviewCount: number;

  stock: number;

  featured: boolean;

  newArrival: boolean;

  bestSeller: boolean;

  images: ProductImage[];

  variants: ProductVariant[];

  specifications: ProductSpecification;

  description: string;

  seo: ProductSEO;

  reviews: ProductReview[];

  relatedProducts: number[];

  completeLook: number[];

  createdAt: string;

  updatedAt: string;
}