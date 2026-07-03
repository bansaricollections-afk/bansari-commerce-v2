"use client";

import { useState } from "react";
import { Heart, Minus, Plus, Share2 } from "lucide-react";
import { Product } from "@/types";
import AddToCartButton from "./AddToCartButton";

type Props = {
  product: Product;
};

export default function ProductActions({ product }: Props) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-6">

      {/* Quantity */}

      <div>

        <h3 className="mb-3 text-lg font-semibold">
          Quantity
        </h3>

        <div className="flex w-fit items-center rounded-xl border">

          <button
            onClick={() =>
              setQuantity((q) => Math.max(1, q - 1))
            }
            className="p-4 hover:bg-gray-100"
          >
            <Minus size={18} />
          </button>

          <span className="min-w-[60px] text-center font-semibold">
            {quantity}
          </span>

          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="p-4 hover:bg-gray-100"
          >
            <Plus size={18} />
          </button>

        </div>

      </div>

      {/* Add To Cart */}

      <AddToCartButton product={product} />

      {/* Buy Now */}

      <button
        className="w-full rounded-full border border-[#8A5A6A] py-4 text-lg font-semibold text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
      >
        Buy Now
      </button>

      {/* Wishlist & Share */}

      <div className="flex gap-4">

        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition hover:bg-[#FFF7F5]">
          <Heart size={20} />
          Wishlist
        </button>

        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition hover:bg-[#FFF7F5]">
          <Share2 size={20} />
          Share
        </button>

      </div>

    </div>
  );
}