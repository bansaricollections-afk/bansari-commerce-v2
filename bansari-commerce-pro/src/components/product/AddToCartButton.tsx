"use client";

import { useCart } from "@/store/cart";
import { Product } from "@/types";

type Props = {
  product: Product;
};

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();

  const image =
    product.images.length > 0
      ? product.images[0].url
      : "/placeholder.png";

  return (
    <button
      onClick={() => {
        addItem({
          id: product.id,
          name: product.name,
          image,
          price: product.price,
          quantity: 1,
        });

        alert(`${product.name} added to cart.`);
      }}
      className="mt-8 w-full rounded-full bg-[#8A5A6A] py-4 text-lg font-medium text-white transition-all duration-300 hover:bg-[#734757]"
    >
      Add to Cart
    </button>
  );
}