import Link from "next/link";

import ProductCard from "@/components/product/ProductCard";
import { getFeaturedProducts } from "@/services/product.service";

export default async function FeaturedProducts() {
  const featuredProducts = (await getFeaturedProducts()).slice(0, 8);

  return (
    <section className="bg-[#FAF8F5] py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-14 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <p className="uppercase tracking-[5px] text-[#8A5A6A]">
              Featured Collection
            </p>

            <h2 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
              Handpicked For You
            </h2>

            <p className="mt-4 max-w-2xl text-gray-600">
              Discover our most loved styles selected for weddings,
              celebrations, office wear and timeless elegance.
            </p>
          </div>

          <Link
            href="/shop"
            className="rounded-full border border-[#8A5A6A] px-8 py-4 font-semibold text-[#8A5A6A] transition-all duration-300 hover:bg-[#8A5A6A] hover:text-white"
          >
            View All Products
          </Link>
        </div>

        {/* Products */}
        {featuredProducts.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <h3 className="text-2xl font-semibold text-gray-900">
              Featured products coming soon
            </h3>

            <p className="mt-3 text-gray-500">
              New arrivals will appear here shortly.
            </p>

            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-full bg-[#8A5A6A] px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              Browse Collection
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}