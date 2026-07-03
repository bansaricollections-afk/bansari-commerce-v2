export interface Review {
  id: number;

  productId: number;

  customerName: string;

  rating: number;

  title: string;

  review: string;

  verifiedPurchase: boolean;

  images?: string[];

  createdAt: string;
}