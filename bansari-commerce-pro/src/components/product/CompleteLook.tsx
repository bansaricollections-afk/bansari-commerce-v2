import Image from 'next/image';
import Link from 'next/link';

import { getRelatedProducts } from '@/services/product.service';
import type { Product } from '@/types/product';

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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {related.slice(0, 4).map((item) => {
          const img1 = item.images?.[0]?.url;
          const img2 = item.images?.[1]?.url;
          const hasDiscount = item.oldPrice && item.oldPrice > item.price;

          return (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="group block"
              aria-label={`View ${item.name}`}
            >
              {/* Image with hover swap */}
              <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 rounded-sm mb-3">
                {img1 ? (
                  <>
                    <Image
                      src={img1}
                      alt={item.images?.[0]?.alt || item.name}
                      fill
                      className={`object-cover transition-all duration-500 ${
                        img2 ? 'group-hover:opacity-0' : 'group-hover:scale-105'
                      }`}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                    />
                    {img2 && (
                      <Image
                        src={img2}
                        alt={item.images?.[1]?.alt || item.name}
                        fill
                        className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        loading="lazy"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-300 text-xs">No image</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {item.newArrival && (
                    <span className="bg-[#8A5A6A] text-white text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5">
                      New
                    </span>
                  )}
                  {item.bestSeller && (
                    <span className="bg-slate-900 text-white text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5">
                      Bestseller
                    </span>
                  )}
                </div>

                {/* Discount ribbon */}
                {hasDiscount && (
                  <span className="absolute top-2 right-2 bg-green-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-sm">
                    {Math.round(((item.oldPrice! - item.price) / item.oldPrice!) * 100)}% off
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-800 truncate group-hover:text-[#8A5A6A] transition-colors">
                  {item.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-900 font-light">₹{item.price.toLocaleString('en-IN')}</span>
                  {hasDiscount && (
                    <span className="text-xs text-slate-400 line-through">₹{item.oldPrice!.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
