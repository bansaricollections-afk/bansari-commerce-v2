'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { Product } from '@/types/product';
import type { ProductVariant } from '@/types/product';

import ProductActions from './ProductActions';
import ProductVariantSelector from './ProductVariantSelector';
import QuantitySelector from './QuantitySelector';
import PincodeChecker from './PincodeChecker';

// TrustBadges rendered ONCE in page.tsx — never here.

interface Props {
  product: Product;
  canonicalUrl: string;
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  const full = Math.round(rating);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1,2,3,4,5].map((s) => (
          <svg key={s} className={`w-3.5 h-3.5 ${s <= full ? 'text-[#8A5A6A]' : 'text-slate-200'}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] text-slate-500">{rating.toFixed(1)}</span>
      <span className="text-slate-200 text-xs">·</span>
      <a href="#reviews" className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-[#8A5A6A] transition-colors">
        {count} {count === 1 ? 'review' : 'reviews'}
      </a>
    </div>
  );
}

export default function ProductInfo({ product, canonicalUrl }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)
    : 0;
  const isOutOfStock = !product.stock || product.stock === 0;
  const isLowStock = !isOutOfStock && (product.stock ?? 0) <= 5;
  const specs = product.specifications;

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-slate-400">
          <li><Link href="/" className="hover:text-[#8A5A6A] transition-colors">Home</Link></li>
          <li aria-hidden><span className="mx-1">›</span></li>
          <li><Link href="/shop" className="hover:text-[#8A5A6A] transition-colors">Shop</Link></li>
          {product.category && (
            <>
              <li aria-hidden><span className="mx-1">›</span></li>
              <li>
                <Link
                  href={`/collections/${product.category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-[#8A5A6A] transition-colors"
                >
                  {product.category}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* ── Collection label ── */}
      {product.collection && (
        <p className="text-[10px] tracking-[0.22em] uppercase text-[#8A5A6A] font-medium -mb-4">
          {product.collection}
        </p>
      )}

      {/* ── Product name ── */}
      <div>
        <h1 className="text-[1.65rem] lg:text-3xl font-light text-slate-900 leading-snug tracking-tight">
          {product.name}
        </h1>
        {product.reviewCount && product.reviewCount > 0 && product.rating ? (
          <div className="mt-2">
            <StarRow rating={product.rating} count={product.reviewCount} />
          </div>
        ) : null}
      </div>

      {/* ── Price row ── */}
      <div className="border-t border-b border-slate-100 py-4 flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-light text-slate-900">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="text-base text-slate-400 line-through font-light">
                ₹{product.oldPrice!.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded">
                {discountPct}% off
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 tracking-wide">
          Inclusive of all taxes · Free shipping on all orders
        </p>
        {/* Availability + Style Code */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
          {isOutOfStock ? (
            <span className="flex items-center gap-1 text-[11px] text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Only {product.stock} left
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              In Stock
            </span>
          )}
          {(product.sku || product.styleCode) && (
            <span className="text-[11px] text-slate-400">
              Style: {product.styleCode ?? product.sku}
            </span>
          )}
        </div>
      </div>

      {/* ── Size selector ── */}
      {product.variants && product.variants.length > 0 && (
        <ProductVariantSelector
          variants={product.variants}
          selected={selectedVariant}
          onSelect={setSelectedVariant}
        />
      )}

      {/* ── Quantity ── */}
      {!isOutOfStock && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
            Quantity
          </p>
          <QuantitySelector value={quantity} onChange={setQuantity} max={product.stock} />
        </div>
      )}

      {/* ── Pincode delivery checker ── */}
      <PincodeChecker />

      {/* ── Action buttons ── */}
      <ProductActions
        product={product}
        quantity={quantity}
        selectedVariant={selectedVariant}
      />

      {/* ── Quick spec pills ── */}
      {specs && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 pt-4 border-t border-slate-100">
          {specs.fabric && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Fabric</p>
              <p className="text-sm text-slate-700 font-light">{specs.fabric}</p>
            </div>
          )}
          {specs.occasion && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Occasion</p>
              <p className="text-sm text-slate-700 font-light">
                {Array.isArray(specs.occasion) ? specs.occasion.join(', ') : specs.occasion}
              </p>
            </div>
          )}
          {specs.fit && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Fit</p>
              <p className="text-sm text-slate-700 font-light">{specs.fit}</p>
            </div>
          )}
          {specs.neckline && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Neckline</p>
              <p className="text-sm text-slate-700 font-light">{specs.neckline}</p>
            </div>
          )}
          {specs.sleeve && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Sleeve</p>
              <p className="text-sm text-slate-700 font-light">{specs.sleeve}</p>
            </div>
          )}
          {specs.work && (
            <div>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 mb-0.5">Work</p>
              <p className="text-sm text-slate-700 font-light">{specs.work}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
