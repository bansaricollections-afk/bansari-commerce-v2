import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  // Optional line-item disambiguators (Batch 3 — data layer only).
  // `variant` stores the human-readable variant value (e.g. color name),
  // never an id — ids are implementation details, color/size are the
  // business value surfaced in cart UI, order summaries, admin, and emails.
  size?: string;
  variant?: string;
};

/**
 * A cart line's identity. Two lines are the same row if and only if
 * id, size, AND variant all match — never id alone. This is the single
 * definition of "same line" used by every mutating cart operation
 * (addItem, removeItem, increaseQuantity, decreaseQuantity, updateQuantity)
 * so they can never drift out of sync with each other.
 */
export type CartLineIdentity = {
  id: number;
  size?: string;
  variant?: string;
};

const isSameLine = (item: CartLineIdentity, target: CartLineIdentity) =>
  item.id === target.id &&
  item.size === target.size &&
  item.variant === target.variant;

type CartStore = {
  items: CartItem[];
  // Internal hydration flag — not persisted, not part of public cart API.
  // Set to true by onRehydrateStorage once localStorage has been read.
  _hasHydrated: boolean;

  addItem: (item: CartItem) => void;
  updateQuantity: (line: CartLineIdentity, quantity: number) => void;
  increaseQuantity: (line: CartLineIdentity) => void;
  decreaseQuantity: (line: CartLineIdentity) => void;
  removeItem: (line: CartLineIdentity) => void;
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
          const existing = state.items.find((i) => isSameLine(i, item));

          if (existing) {
            return {
              items: state.items.map((i) =>
                isSameLine(i, item)
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

      updateQuantity: (line, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            isSameLine(item, line)
              ? {
                  ...item,
                  quantity: Math.max(1, quantity),
                }
              : item
          ),
        })),

      increaseQuantity: (line) =>
        set((state) => ({
          items: state.items.map((item) =>
            isSameLine(item, line)
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          ),
        })),

      decreaseQuantity: (line) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              isSameLine(item, line)
                ? {
                    ...item,
                    quantity: Math.max(0, item.quantity - 1),
                  }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),

      removeItem: (line) =>
        set((state) => ({
          items: state.items.filter((item) => !isSameLine(item, line)),
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
