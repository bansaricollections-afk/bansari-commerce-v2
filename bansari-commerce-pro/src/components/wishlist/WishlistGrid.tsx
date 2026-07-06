"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

import { useWishlist } from "@/store/wishlist";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

type Props = {
  products: Product[];
};

export default function WishlistGrid({ products }: Props) {
  const {
    items,
    removeItem,
  } = useWishlist();

  const { addItem } = useCart();

  const wishlistProducts = products.filter((product) =>
    items.some((item) => item.id === product.id)
  );

  if (wishlistProducts.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFFDF9]">

        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">

          <Heart
            size={80}
            className="mb-8 text-[#8A5A6A]"
          />

          <h1 className="font-[family:var(--font-playfair)] text-5xl font-bold">
            My Closet
          </h1>

          <p className="mt-6 max-w-xl text-lg text-gray-600">
            Save your favourite outfits here and revisit them whenever inspiration strikes.
          </p>

          <Link
            href="/shop"
            className="mt-10 rounded-full bg-[#8A5A6A] px-10 py-4 text-white transition hover:bg-[#734757]"
          >
            Discover Collection
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">

      <div className="mx-auto max-w-7xl px-6 py-16">

        <h1 className="mb-12 font-[family:var(--font-playfair)] text-5xl font-bold">
          My Closet
        </h1>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {wishlistProducts.map((product) => (

            <div
              key={product.id}
              className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-xl"
            >

              <Image
                src={product.images[0].url}
                alt={product.name}
                width={500}
                height={650}
                className="h-[380px] w-full object-cover"
              />

              <div className="space-y-4 p-6">

                <h2 className="text-2xl font-semibold">
                  {product.name}
                </h2>

                <p className="font-bold text-[#8A5A6A]">
                  ₹{product.price}
                </p>

                <div className="flex gap-3">

                  <button
                    onClick={() =>
                      addItem({
                        id: product.id,
                        name: product.name,
                        image: product.images[0].url,
                        price: product.price,
                        quantity: 1,
                      })
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#8A5A6A] py-3 text-white transition hover:bg-[#734757]"
                  >
                    <ShoppingBag size={18} />
                    Add to Bag
                  </button>

                  <button
                    onClick={() => removeItem(product.id)}
                    className="rounded-full border p-3 transition hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
