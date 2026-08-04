// ─── Sprint 9C — SearchResultsGrid (RSC) ───────────────────────────────────
// Reuses ProductCard from Sprint 9A/9B.
// Renders search results from the search_products RPC.
import ProductCard from '@/components/product/ProductCard';
import type { SearchProduct } from '@/types/search';

interface Props {
  products: SearchProduct[];
  query: string;
}

export default function SearchResultsGrid({ products, query }: Props) {
  if (products.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label={`Search results for “${query}”`}
    >
      {products.map((product, i) => (
        <div key={product.id} role="listitem">
          {/* Map SearchProduct → ProductCard's expected shape */}
          <ProductCard
            product={{
              ...product,
              id:            String(product.id),
              compare_price: product.compare_price ?? undefined,
              images:        product.images ?? [],
              sizes:         product.sizes ?? [],
              specifications: product.specifications ?? {},
            }}
            priority={i < 4}
          />
        </div>
      ))}
    </div>
  );
}
