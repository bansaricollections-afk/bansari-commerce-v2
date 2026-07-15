/**
 * Wishlist service
 *
 * Wishlist is currently managed client-side via localStorage (WishlistContext).
 * This file is reserved for future server-side wishlist persistence when a
 * `wishlists` Supabase table is introduced.
 *
 * No schema exists yet — do not add Supabase queries here until the migration
 * in /supabase/migrations/wishlist.sql is applied.
 */

export type WishlistItem = {
  product_id: number;
  added_at: string;
};

// placeholder — implemented in WishlistContext (client-side)
export {};
