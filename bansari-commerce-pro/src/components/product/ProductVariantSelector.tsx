"use client";

import { useState } from "react";
import { Product } from "@/types";

type Props = {
  product: Product;
};

export default function ProductVariantSelector({ product }: Props) {
  const firstVariant = product.variants[0];

  const [selectedSize, setSelectedSize] = useState(
    firstVariant?.sizes[0]?.size || ""
  );

  if (!firstVariant) return null;

  return (
    <div className="space-y-6">

      {/* Size Header */}

      <div className="flex items-center justify-between">

        <h3 className="text-lg font-semibold">
          Select Size
        </h3>

        <button className="text-sm font-medium text-[#8A5A6A] hover:underline">
          Size Guide
        </button>

      </div>

      {/* Sizes */}

      <div className="flex flex-wrap gap-3">

        {firstVariant.sizes.map((item) => {

          const active = selectedSize === item.size;

          const outOfStock = item.stock === 0;

          return (
            <button
              key={item.sku}
              disabled={outOfStock}
              onClick={() => setSelectedSize(item.size)}
              className={`h-12 min-w-[56px] rounded-xl border text-sm font-semibold transition

                ${
                  active
                    ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                    : "border-[#DDD] bg-white hover:border-[#8A5A6A]"
                }

                ${
                  outOfStock
                    ? "cursor-not-allowed opacity-40"
                    : ""
                }

              `}
            >
              {item.size}
            </button>
          );
        })}

      </div>

      {/* Selected Size */}

      <div className="rounded-xl bg-[#FFF7F5] p-4">

        <p className="text-sm text-gray-500">
          Selected Size
        </p>

        <p className="mt-1 font-semibold">
          {selectedSize}
        </p>

      </div>

    </div>
  );
}