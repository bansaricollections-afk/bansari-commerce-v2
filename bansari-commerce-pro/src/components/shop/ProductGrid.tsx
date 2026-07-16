import ProductCard from "@/components/product/ProductCard";
import { getProducts } from "@/services/product.service";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";
import { Suspense } from "react";

async function GridInner() {
  const productList = await getProducts();

  if (productList.length === 0) {
    return (
      <div
        className="flex min-h-[480px] flex-col items-center justify-center border border-dashed border-slate-200 bg-white p-12 text-center"
        role="status"
        aria-live="polite"
      >
        {/* Empty state illustration */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-slate-300"
            aria-hidden="true"
          >
            <path
              d="M8 36l8-12 8 8 8-14 8 18H8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="font-[family:var(--font-playfair)] text-2xl font-normal text-slate-900">
          Nothing found
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
          No products match your current filters. Try broadening your selection or clearing all filters.
        </p>
        <a
          href="/shop"
          className="mt-6 inline-block border border-[#8A5A6A] px-6 py-2.5 text-xs font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
        >
          View all products
        </a>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Products"
    >
      {productList.map((product, i) => (
        <div key={product.id} role="listitem">
          <ProductCard product={product} priority={i < 4} />
        </div>
      ))}
    </div>
  );
}

export default function ProductGrid() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <GridInner />
    </Suspense>
  );
}
