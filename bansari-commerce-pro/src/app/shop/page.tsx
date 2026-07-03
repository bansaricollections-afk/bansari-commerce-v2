import ActiveFilters from "@/components/shop/ActiveFilters";
import FilterSidebar from "@/components/shop/FilterSidebar";
import Pagination from "@/components/shop/Pagination";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopToolbar from "@/components/shop/ShopToolbar";

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        {/* Page Header */}
        <div className="mb-10">
          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Bansari Collections
          </p>

          <h1 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
            Shop Collection
          </h1>

          <p className="mt-4 max-w-2xl text-gray-600">
            Explore our curated collection of ethnic wear designed for weddings,
            celebrations, office wear, festive occasions, and everyday elegance.
          </p>
        </div>

        {/* Layout */}
        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside>
            <FilterSidebar />
          </aside>

          {/* Product Listing */}
          <section>
            <ShopToolbar />

            <div className="mt-6">
              <ActiveFilters />
            </div>

            <div className="mt-8">
              <ProductGrid />
            </div>

            <div className="mt-12 flex justify-center">
              <Pagination />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}