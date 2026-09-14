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
    size,
  }: {
    product: { id: number; name: string; price: number; images?: { url?: string }[] };
    quantity: number;
    variant?: unknown;
    /** Selected size for size-managed products — carried through to the order. */
    size?: { variantId: number; label: string; sku?: string } | null;
  }) {
    store.addItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0]?.url ?? '',
      price: product.price,
      quantity,
      variantId: size?.variantId ?? null,
      size: size?.label ?? null,
      variantSku: size?.sku ?? null,
    });
  }

  /**
   * addItem — the card-level adapter, for products that are NOT size-managed.
   *
   * This used to accept only { productId, quantity } and write name: '',
   * price: 0, image: '' into the store, on the assumption that "the cart
   * drawer should enrich from its own state". It does not — nothing enriches
   * it — so any caller silently produced a blank ₹0 cart line. The display
   * fields are now required, because the caller always has them.
   *
   * A size-managed product must NOT come through here: the line would carry no
   * variantId and validateCartItems rejects the order at payment with "Please
   * select a size". Send those to the PDP instead (see ProductCard and
   * WishlistGrid), or use addToCart with a resolved size.
   */
  function addItem({
    productId,
    quantity,
    name,
    price,
    image,
  }: {
    productId: number;
    quantity: number;
    name: string;
    price: number;
    image?: string;
  }) {
    store.addItem({
      id: productId,
      name,
      image: image ?? '',
      price,
      quantity,
    });
  }

  return {
    ...store,
    addToCart,
    addItem,
  };
}
