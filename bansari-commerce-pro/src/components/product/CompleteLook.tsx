import Image from 'next/image';
import Link from 'next/link';

import { getRelatedProducts } from '@/services/product.service';
import type { Product } from '@/types/product';

interface Props {
  product: Product;
}

export default async function CompleteLook({ product }: Props) {
  const related = product.category ? await getRelatedProducts(product.id, product.category, 4) : [];

  if (!related || related.length === 0) return null;

  return (
    <section className="py-16" aria-labelledby="complete-look-heading">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.25em] uppercase text-[#8A5A6A] mb-2">Styled Together</p>
        <h2
          id="complete-look-heading"
          className="text-xl font-light text-slate-900 tracking-tight"
        >
          Complete the Look
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {related.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.id}`}
            className="group block"
            aria-label={`View ${item.name}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 rounded-sm mb-3">
              {item.images?.[0]?.url ? (
                <Image
                  src={item.images[0].url}
                  alt={item.images[0].alt || item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-300 text-xs">No image</span>
                </div>
              )}
              {item.newArrival && (
                <span className="absolute top-2 left-2 bg-[#8A5A6A] text-white text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5">
                  New
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-800 truncate group-hover:text-[#8A5A6A] transition-colors">
                {item.name}
              </p>
              <p className="text-xs text-slate-500">₹{item.price.toLocaleString('en-IN')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
