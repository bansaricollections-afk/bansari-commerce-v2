import Link from "next/link";

import ProductCard from "@/components/product/ProductCard";
import { getFeaturedProducts } from "@/services/product.service";

export default async function FeaturedProducts() {
  const featuredProducts = (await getFeaturedProducts()).slice(0, 4);

  return (
    <section className="bg-[#FAF8F5] py-32">
      <div className="mx-auto max-w-7xl px-6">

        {/* Editorial header — left-aligned, no centring */}
        <div className="mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A5A6A]">
            The Bansari Edit
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-3xl font-normal text-[#1C1917] md:text-4xl">
            The House Edit
          </h2>

          <p className="mt-3 text-sm font-normal text-[#78716C]">
            The finest of the season, considered and placed here.
          </p>
        </div>

        {/* Product rail */}
        {featuredProducts.length > 0 ? (
          <div className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="font-[family:var(--font-playfair)] text-2xl font-normal text-[#1C1917]">
              The edit is being prepared.
            </p>
            <p className="mt-3 text-sm text-[#78716C]">
              New pieces will appear here shortly.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block text-xs font-medium tracking-wide text-[#8A5A6A] underline-offset-4 hover:underline"
            >
              Browse the full collection
            </Link>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-16 text-center">
          <Link
            href="/shop"
            className="text-xs font-normal tracking-wide text-[#78716C] underline-offset-4 transition-colors duration-200 hover:text-[#1C1917] hover:underline"
          >
            View the full edit &rarr;
          </Link>
        </div>

      </div>
    </section>
  );
}
