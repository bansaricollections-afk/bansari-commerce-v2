import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

export default function RecentlyViewed() {
  const recentProducts = products.slice(0, 4);

  return (
    <section className="mt-24 border-t border-gray-200 pt-20">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Continue Shopping
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-4xl font-bold">
            Recently Viewed
          </h2>

          <p className="mt-3 text-gray-600">
            Quickly revisit the styles you&apos;ve explored.
          </p>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {recentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}