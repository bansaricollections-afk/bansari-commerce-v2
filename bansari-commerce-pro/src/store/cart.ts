import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  /**
   * Size identity. Present for size-managed products; the variant is what is
   * actually purchased, reserved and decremented, so two sizes of the same
   * product are two independent cart lines.
   */
  variantId?: number | null;
  size?: string | null;
  variantSku?: string | null;
};

/**
 * Stable per-line key. A cart line is identified by (product, variant) — not
 * by product alone — so M and L never collapse into one line.
 */
export function cartLineId(item: Pick<CartItem, 'id' | 'variantId'>): string {
  return `${item.id}:${item.variantId ?? ''}`;
}

type CartStore = {
  items: CartItem[];
  // Internal hydration flag — not persisted, not part of public cart API.
  // Set to true by onRehydrateStorage once localStorage has been read.
  _hasHydrated: boolean;

  addItem: (item: CartItem) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  increaseQuantity: (lineId: string) => void;
  decreaseQuantity: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;

  totalItems: () => number;
  totalUniqueItems: () => number;
  totalPrice: () => number;

  // Internal setter — called only by onRehydrateStorage below.
  _setHasHydrated: (v: boolean) => void;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,

      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      addItem: (item) =>
        set((state) => {
          const key = cartLineId(item);
          const existing = state.items.find((i) => cartLineId(i) === key);

          if (existing) {
            return {
              items: state.items.map((i) =>
                cartLineId(i) === key
                  ? {
                      ...i,
                      quantity: i.quantity + item.quantity,
                    }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, item],
          };
        }),

      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            cartLineId(item) === lineId
              ? {
                  ...item,
                  quantity: Math.max(1, quantity),
                }
              : item
          ),
        })),

      increaseQuantity: (lineId) =>
        set((state) => ({
          items: state.items.map((item) =>
            cartLineId(item) === lineId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          ),
        })),

      decreaseQuantity: (lineId) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              cartLineId(item) === lineId
                ? {
                    ...item,
                    quantity: Math.max(0, item.quantity - 1),
                  }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => cartLineId(item) !== lineId),
        })),

      clearCart: () =>
        set({
          items: [],
        }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalUniqueItems: () => get().items.length,

      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
    }),
    {
      name: "bansari-cart",
      // _hasHydrated is client-only runtime state — never write it to storage.
      partialize: (state) => ({
        items: state.items,
      }),
      // onRehydrateStorage fires once the persist middleware has finished
      // reading from localStorage (or immediately if nothing was stored).
      // Setting _hasHydrated here is the canonical Zustand pattern for
      // SSR-safe conditional rendering based on persisted state.
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);

/**
 * Stable selector — returns true once the persist middleware has finished
 * reading from localStorage. Use this in components that must not render
 * empty-state UI before the cart is known to be genuinely empty.
 *
 * Usage:
 *   const hydrated = useCartHasHydrated();
 *   if (!hydrated) return <Skeleton />;
 */
export const useCartHasHydrated = () =>
  useCart((s) => s._hasHydrated);
