"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Product } from "@/types";
import { useCart } from "@/store/cart";

type Props = {
  product: Product;
};

const sizes = ["S", "M", "L", "XL", "XXL"];

export default function ProductInfo({ product }: Props) {
  const router = useRouter();

  const addItem = useCart((state) => state.addItem);

  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0]?.url || "/placeholder.png",
      price: product.price,
      quantity,
    });

    alert("Product added to cart.");
  }

  function handleBuyNow() {
    addItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0]?.url || "/placeholder.png",
      price: product.price,
      quantity,
    });

    router.push("/checkout");
  }

  return (
    <div className="space-y-6">
      {product.badge && (
        <span className="inline-flex rounded-full bg-[#8A5A6A] px-4 py-2 text-sm font-medium text-white">
          {product.badge}
        </span>
      )}

      <h1 className="font-[family:var(--font-playfair)] text-4xl font-normal leading-tight tracking-wide lg:text-5xl">
        {product.name}
      </h1>

      <div className="flex items-center gap-3">
        <span className="text-lg text-yellow-500">★★★★★</span>

        <span className="font-medium">
          {product.rating.toFixed(1)}
        </span>

        <span className="text-gray-500">
          ({product.reviewCount} Reviews)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-4xl font-bold text-[#8A5A6A]">
          ₹{product.price.toLocaleString("en-IN")}
        </span>

        {product.oldPrice && (
          <>
            <span className="text-2xl text-gray-400 line-through">
              ₹{product.oldPrice.toLocaleString("en-IN")}
            </span>

            {product.discount > 0 && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                {product.discount}% OFF
              </span>
            )}
          </>
        )}
      </div>

      <div>
        {product.stock > 5 ? (
          <p className="font-medium text-green-600">
            ✓ In Stock
          </p>
        ) : product.stock > 0 ? (
          <p className="font-medium text-orange-600">
            Only {product.stock} pieces left
          </p>
        ) : (
          <p className="font-medium text-red-600">
            Out of Stock
          </p>
        )}
      </div>

      <p className="leading-8 text-gray-600">
        {product.description}
      </p>

      <div className="space-y-3">
        <h3 className="font-semibold">
          Select Size
        </h3>

        <div className="flex flex-wrap gap-3">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedSize(size)}
              className={`rounded-xl border px-5 py-3 font-medium transition ${
                selectedSize === size
                  ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                  : "border-gray-300 hover:border-[#8A5A6A]"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">
          Quantity
        </h3>

        <div className="flex w-fit items-center rounded-xl border">
          <button
            type="button"
            onClick={() =>
              setQuantity((value) => Math.max(1, value - 1))
            }
            className="px-4 py-3"
          >
            −
          </button>

          <span className="min-w-12 text-center">
            {quantity}
          </span>

          <button
            type="button"
            onClick={() =>
              setQuantity((value) => value + 1)
            }
            className="px-4 py-3"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="rounded-full border-2 border-[#8A5A6A] py-4 font-semibold text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to Cart
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={product.stock === 0}
          className="rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 rounded-2xl border border-[#ECE7E2] bg-[#FFFDF9] p-5">
        <div>
          <p className="text-sm text-gray-500">
            Fabric
          </p>

          <p className="font-semibold">
            {product.specifications.fabric}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Work
          </p>

          <p className="font-semibold">
            {product.specifications.work}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Neckline
          </p>

          <p className="font-semibold">
            {product.specifications.neckline}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Sleeve
          </p>

          <p className="font-semibold">
            {product.specifications.sleeve}
          </p>
        </div>
      </div>
    </div>
  );
}
