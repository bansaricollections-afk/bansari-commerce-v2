import Link from 'next/link';

import { getRelatedProducts } from '@/services/product.service';
import type { Product } from '@/types/product';

import ProductCard from './ProductCard';

interface Props { product: Product; }

export default async function CompleteLook({ product }: Props) {
  const related = product.category
    ? await getRelatedProducts(product.id, product.category, 6)
    : [];

  if (!related || related.length === 0) return null;

  return (
    <section className="py-16" aria-labelledby="related-heading">
      {/* Section header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#8A5A6A] mb-1.5 font-medium">You may also love</p>
          <h2 id="related-heading" className="text-xl font-light text-slate-900 tracking-tight">
            Complete the Look
          </h2>
        </div>
        <Link
          href="/shop"
          className="hidden sm:inline-flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-slate-500 hover:text-[#8A5A6A] transition-colors"
        >
          View all
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Grid — delegates all card rendering to the shared ProductCard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {related.slice(0, 4).map((item, index) => (
          <ProductCard
            key={item.id}
            product={item}
            priority={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
