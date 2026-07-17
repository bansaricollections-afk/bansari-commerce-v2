/**
 * useWishlist — adapter shim.
 *
 * The canonical store lives in @/store/wishlist (Zustand).
 * This file re-exports the hook and adds the `toggleWishlist` and
 * `isInWishlist` aliases that ProductActions.tsx expects, mapping them
 * to the store's addItem / removeItem / isWishlisted without touching
 * any store internals.
 */
'use client';

import { useWishlist as useWishlistStore } from '@/store/wishlist';

/**
 * Augmented hook that adds toggleWishlist and isInWishlist adapters.
 */
export function useWishlist() {
  const store = useWishlistStore();

  function toggleWishlist(id: number) {
    if (store.isWishlisted(id)) {
      store.removeItem(id);
    } else {
      store.addItem(id);
    }
  }

  function isInWishlist(id: number): boolean {
    return store.isWishlisted(id);
  }

  return {
    ...store,
    toggleWishlist,
    isInWishlist,
  };
}
