'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { Product } from '@/types/product';

import ProductActions from './ProductActions';
import ProductVariantSelector from './ProductVariantSelector';
import QuantitySelector from './QuantitySelector';
import TrustBadges from './TrustBadges';

interface Props {
  product: Product;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.round(rating) ? 'text-[#8A5A6A]' : 'text-slate-200'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-slate-500 text-xs tracking-wide">{rating.toFixed(1)}</span>
      <span className="text-slate-300 text-xs">•</span>
      <a href="#reviews" className="text-xs text-slate-500 hover:text-[#8A5A6A] transition-colors underline underline-offset-2">
        {count} {count === 1 ? 'review' : 'reviews'}
      </a>
    </div>
  );
}

export default function ProductInfo({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.[0] ?? null
  );

  const hasDiscount =
    product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.original_price! - product.price) / product.original_price!) *
          100
      )
    : 0;
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const specs = product.specifications;

  return (
    <div className="flex flex-col gap-7">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase text-slate-400">
          <li><Link href="/" className="hover:text-[#8A5A6A] transition-colors">Home</Link></li>
          <li><span aria-hidden="true">›</span></li>
          <li><Link href="/shop" className="hover:text-[#8A5A6A] transition-colors">Shop</Link></li>
          {product.category && (
            <>
              <li><span aria-hidden="true">›</span></li>
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

      {/* Collection & Title */}
      <div className="flex flex-col gap-2.5">
        {product.collection && (
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#8A5A6A] font-medium">
            {product.collection}
          </p>
        )}
        <h1 className="text-2xl lg:text-3xl font-light text-slate-900 leading-tight tracking-tight">
          {product.name}
        </h1>
        {product.reviewCount > 0 && (
          <StarRating rating={product.rating} count={product.reviewCount} />
        )}
      </div>

      {/* Price */}
      <div className="flex flex-col gap-1.5 pb-6 border-b border-slate-100">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-light text-slate-900">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span className="text-base text-slate-400 line-through">
              ₹{product.original_price!.toLocaleString('en-IN')}
            </span>
          )}
          {hasDiscount && (
            <span className="text-xs font-medium bg-[#8A5A6A]/10 text-[#8A5A6A] px-2 py-0.5 rounded-sm">
              {discountPercent}% off
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 tracking-wide">
          Inclusive of all taxes · Free shipping on all orders
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-slate-500">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cash on Delivery
          </span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-slate-500">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Free Returns
          </span>
        </div>
      </div>

      {/* Stock status */}
      {isOutOfStock && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 px-4 py-3 rounded-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          This item is currently out of stock. Join the waitlist below.
        </div>
      )}
      {isLowStock && !isOutOfStock && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Only {product.stock} left in stock — order soon
        </div>
      )}

      {/* Variant selector */}
      {product.variants && product.variants.length > 0 && (
        <ProductVariantSelector
          variants={product.variants}
          selected={selectedVariant}
          onSelect={setSelectedVariant}
        />
      )}

      {/* Quantity */}
      {!isOutOfStock && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] tracking-[0.15em] uppercase text-slate-500 font-medium">
            Quantity
          </label>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={product.stock}
          />
        </div>
      )}

      {/* CTA actions */}
      <ProductActions product={product} quantity={quantity} selectedVariant={selectedVariant} />

      {/* Product attributes */}
      {specs && Object.keys(specs).some((k) => (specs as Record<string, unknown>)[k]) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-6 border-t border-slate-100">
          {specs.fabric && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">Fabric</span>
              <span className="text-sm text-slate-700">{specs.fabric}</span>
            </div>
          )}
          {specs.occasion && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">Occasion</span>
              <span className="text-sm text-slate-700">{specs.occasion}</span>
            </div>
          )}
          {specs.fit && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">Fit</span>
              <span className="text-sm text-slate-700">{specs.fit}</span>
            </div>
          )}
          {specs.work_details && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">Craftsmanship</span>
              <span className="text-sm text-slate-700">{specs.work_details}</span>
            </div>
          )}
          {product.sku && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">SKU</span>
              <span className="text-sm text-slate-500 font-mono">{product.sku}</span>
            </div>
          )}
          {product.category && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">Category</span>
              <span className="text-sm text-slate-700">{product.category}</span>
            </div>
          )}
        </div>
      )}

      {/* Trust badges */}
      <TrustBadges />
    </div>
  );
}
