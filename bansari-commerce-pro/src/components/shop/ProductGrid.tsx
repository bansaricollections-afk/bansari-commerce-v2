import ProductCard from "@/components/product/ProductCard";
import { getProducts } from "@/services/product.service";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";
import { Suspense } from "react";

async function GridInner() {
  const productList = await getProducts();

  if (productList.length === 0) {
    return (
      <div
        className="flex min-h-[520px] flex-col items-center justify-center border border-dashed border-slate-200 bg-white p-12 text-center"
        role="status"
        aria-live="polite"
      >
        {/* Empty state */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center border border-slate-100 bg-slate-50">
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
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A5A6A]">
          No results
        </p>
        <h2 className="font-[family:var(--font-playfair)] text-2xl font-normal text-slate-900">
          Nothing found
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
          No products match your current filters. Try broadening your selection or clearing all filters.
        </p>
        <a
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 border border-[#8A5A6A] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A5A6A] transition-all duration-200 hover:bg-[#8A5A6A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
        >
          View all products
        </a>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
