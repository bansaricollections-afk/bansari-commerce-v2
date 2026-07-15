/**
 * Reviews service
 *
 * No `reviews` table exists in the current schema. This stub is reserved
 * for when the reviews migration is applied. Product rating/reviewCount
 * fields are currently defaulted to 0 in mapDbProductToProduct.
 */

export type Review = {
  id: string;
  product_id: number;
  user_id: string | null;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

// placeholder — no schema yet
export {};
