"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Eye,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";

import { Product } from "@/types";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const primaryImage = product.images?.[0]?.url || "/placeholder.png";
  const hoverImage = product.images?.[1]?.url || primaryImage;

  return (
    <article className="group overflow-hidden rounded-3xl border border-[#ECE7E2] bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      {/* Image Section */}

      <div className="relative overflow-hidden">
        <Link
          href={`/product/${product.id}`}
          aria-label={`View ${product.name}`}
        >
          <div className="relative h-[420px] w-full overflow-hidden">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              priority={false}
              loading="lazy"
              sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 25vw"
              className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
            />

            <Image
              src={hoverImage}
              alt={`${product.name} alternate view`}
              fill
              loading="lazy"
              sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 25vw"
              className="absolute inset-0 object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
            />
          </div>
        </Link>

        {/* Badge */}

        {product.badge && (
          <div className="absolute left-4 top-4 rounded-full bg-[#8A5A6A] px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {product.badge}
          </div>
        )}

        {/* Floating Actions */}

        <div className="absolute right-4 top-4 flex flex-col gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Add to wishlist"
            className="rounded-full bg-white p-3 shadow-lg transition hover:scale-110"
          >
            <Heart size={18} />
          </button>

          <button
            type="button"
            aria-label="Quick view"
            className="rounded-full bg-white p-3 shadow-lg transition hover:scale-110"
          >
            <Eye size={18} />
          </button>

          <button
            type="button"
            aria-label="Add to cart"
            className="rounded-full bg-white p-3 shadow-lg transition hover:scale-110"
          >
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>

      {/* Product Content */}

      <div className="space-y-4 p-6">
        <p className="text-xs uppercase tracking-[4px] text-[#8A5A6A]">
          {product.collection}
        </p>

        <Link
          href={`/product/${product.id}`}
          className="block text-xl font-semibold leading-8 transition hover:text-[#8A5A6A]"
        >
          {product.name}
        </Link>

        {/* Rating */}

        <div className="flex items-center gap-2">
          <Star
            size={16}
            className="fill-yellow-400 text-yellow-400"
          />

          <span className="font-medium">
            {product.rating.toFixed(1)}
          </span>

          <span className="text-gray-500">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold text-[#8A5A6A]">
            ₹{product.price.toLocaleString("en-IN")}
          </span>

          {product.oldPrice && (
            <>
              <span className="text-gray-400 line-through">
                ₹{product.oldPrice.toLocaleString("en-IN")}
              </span>

              {product.discount > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                  {product.discount}% OFF
                </span>
              )}
            </>
          )}
        </div>

        {/* Delivery */}

        <div className="flex items-center gap-2 text-sm text-green-700">
          <Truck size={16} />
          <span>Delivery in 2–5 Days</span>
        </div>

        {/* Stock */}

        {product.stock <= 5 && product.stock > 0 && (
          <p className="text-sm font-semibold text-red-600">
            Only {product.stock} left in stock
          </p>
        )}

        {product.stock === 0 && (
          <p className="text-sm font-semibold text-red-600">
            Out of Stock
          </p>
        )}

        {/* Quick Add */}

        <button
          type="button"
          disabled={product.stock === 0}
          className="mt-3 w-full rounded-full bg-[#8A5A6A] py-3 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {product.stock === 0 ? "Out of Stock" : "Quick Add"}
        </button>
      </div>
    </article>
  );
}