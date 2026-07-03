import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

export default function ProductGrid() {
  const productList = products;

  if (productList.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          No products found
        </h2>

        <p className="mt-3 max-w-md text-gray-500">
          We couldn&apos;t find any products matching your current filters. Please
          adjust your filters or check back later for new arrivals.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-900">
            {productList.length}
          </span>{" "}
          products
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {productList.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </>
  );
}
