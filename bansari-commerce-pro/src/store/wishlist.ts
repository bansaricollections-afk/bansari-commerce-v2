import { create } from "zustand";

type WishlistItem = {
  id: number;
};

type WishlistStore = {
  items: WishlistItem[];

  addItem: (id: number) => void;

  removeItem: (id: number) => void;

  isWishlisted: (id: number) => boolean;
};

export const useWishlist = create<WishlistStore>((set, get) => ({

  items: [],

  addItem: (id) =>
    set((state) => ({

      items: state.items.some((item) => item.id === id)
        ? state.items
        : [...state.items, { id }],

    })),

  removeItem: (id) =>
    set((state) => ({

      items: state.items.filter(
        (item) => item.id !== id
      ),

    })),

  isWishlisted: (id) =>
    get().items.some(
      (item) => item.id === id
    ),

}));
