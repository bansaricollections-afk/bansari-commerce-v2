import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type CartStore = {
  items: CartItem[];

  addItem: (item: CartItem) => void;
  updateQuantity: (id: number, quantity: number) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;

  totalItems: () => number;
  totalUniqueItems: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
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

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(1, quantity),
                }
              : item
          ),
        })),

      increaseQuantity: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          ),
        })),

      decreaseQuantity: (id) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === id
                ? {
                    ...item,
                    quantity: Math.max(0, item.quantity - 1),
                  }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
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
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);