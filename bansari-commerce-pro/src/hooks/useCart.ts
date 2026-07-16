/**
 * useCart — adapter shim.
 *
 * The canonical store lives in @/store/cart (Zustand, persisted).
 * This file re-exports the hook under the name components expect, and
 * additionally exposes an `addToCart` adapter so ProductActions.tsx
 * (which calls addToCart({ product, quantity, variant })) and
 * ProductCard.tsx (which calls addItem({ productId, quantity })) can
 * both import from a single location without touching store internals.
 *
 * The underlying store API (addItem, removeItem, etc.) is unchanged.
 */
'use client';

import { useCart as useCartStore, CartItem } from '@/store/cart';

export type { CartItem };

// Re-export the raw store hook for consumers that use it directly.
export { useCartStore as useCart };

/**
 * Augmented hook that adds the `addToCart` and `addItem` adapters.
 * ProductActions.tsx imports { useCart } from '@/hooks/useCart' and
 * immediately calls const { addToCart } = useCart().
 */
export function useCart() {
  const store = useCartStore();

  /**
   * addToCart — accepts the shape used by ProductActions:
   *   { product: Product, quantity: number, variant?: ProductVariant | null }
   * Maps to the store's addItem({ id, name, image, price, quantity }).
   */
  function addToCart({
    product,
    quantity,
  }: {
    product: { id: number; name: string; price: number; images?: { url?: string }[] };
    quantity: number;
    variant?: unknown;
  }) {
    store.addItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0]?.url ?? '',
      price: product.price,
      quantity,
    });
  }

  /**
   * addItem — accepts the shape used by ProductCard:
   *   { productId: number, quantity: number }
   * We cannot look up name/price here (no DB access on client), so we
   * pass minimal data. The cart drawer should enrich from its own state.
   * For a full add-to-cart, prefer navigating to the product page.
   */
  function addItem({ productId, quantity }: { productId: number; quantity: number }) {
    store.addItem({
      id: productId,
      name: '',
      image: '',
      price: 0,
      quantity,
    });
  }

  return {
    ...store,
    addToCart,
    addItem,
  };
}
