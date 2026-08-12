// ─── Sprint 9C — SearchResultsGrid (RSC) ───────────────────────────────────
// Reuses ProductCard from Sprint 9A/9B.
// Renders search results from the search_products RPC.
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';
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
            product={((): Product => ({
              id:            product.id,
              name:          product.name,
              slug:          product.slug,
              price:         product.price,
              stock:         product.stock ?? undefined,
              active:        product.active ?? undefined,
              images:        product.images ?? [],
              category:      product.category ?? undefined,
              collection:    product.collection ?? undefined,
              oldPrice:      product.compare_price ?? undefined,
              // Ratings / review counts are deliberately not passed through.
              // The search RPC returns the same seeded placeholder values as
              // products.rating / products.review_count, which have no real
              // reviews behind them. See mapRow in product.service.ts.
              rating:        undefined,
              reviewCount:   undefined,
              featured:      product.featured ?? undefined,
              newArrival:    product.new_arrival ?? undefined,
              bestSeller:    product.best_seller ?? undefined,
              description:   product.description ?? undefined,
              sku:           product.sku ?? undefined,
              seo:           product.seo_description || product.seo_title ? { title: product.seo_title ?? '', description: product.seo_description ?? '', keywords: [] } : undefined,
              specifications: product.specifications
                ? {
                    fabric:     product.specifications.fabric ?? '',
                    work:       product.specifications.work ?? '',
                    neckline:   product.specifications.neckline ?? '',
                    sleeve:     product.specifications.sleeve ?? '',
                    fit:        product.specifications.fit ?? '',
                    occasion:   product.specifications.occasion
                      ? product.specifications.occasion.split(',').map((value) => value.trim()).filter(Boolean)
                      : [],
                    care:       product.specifications.care ?? '',
                    modelInfo:  product.specifications.modelInfo,
                    sizeWorn:   product.specifications.sizeWorn,
                  }
                : undefined,
            }))()}
            priority={i < 4}
          />
        </div>
      ))}
    </div>
  );
}
