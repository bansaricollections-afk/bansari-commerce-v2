'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { Product } from '@/types/product';
import type { ProductVariant, SizeAvailability } from '@/types/product';
import { trackRecentlyViewed } from '@/lib/recentlyViewed';
import { SHIPPING_THRESHOLD } from '@/lib/shipping';

import DeliveryEstimate from './DeliveryEstimate';
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

// ─── Size Guide Modal ──────────────────────────────────────────────────────
function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-label="Size guide"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-auto max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-slate-900">Size Guide</h2>
          <button
            onClick={onClose}
            aria-label="Close size guide"
            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[#8A5A6A] font-medium mb-4">Indian Ethnic Sizing</p>
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 font-medium">Size</th>
                <th className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 font-medium">Bust (in)</th>
                <th className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 font-medium">Waist (in)</th>
                <th className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 font-medium">Hips (in)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                ['XS', '32', '26', '36'],
                ['S',  '34', '28', '38'],
                ['M',  '36', '30', '40'],
                ['L',  '38', '32', '42'],
                ['XL', '40', '34', '44'],
                ['XXL','42', '36', '46'],
              ].map(([size, bust, waist, hips]) => (
                <tr key={size}>
                  <td className="py-2 font-medium text-slate-900">{size}</td>
                  <td className="py-2 text-slate-600">{bust}</td>
                  <td className="py-2 text-slate-600">{waist}</td>
                  <td className="py-2 text-slate-600">{hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
            Measurements are in inches. For the best fit, measure over your fullest points.
            If you are between sizes, size up. All garments are unstitched unless noted.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProductInfo({ product, canonicalUrl }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeAvailability | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // ── Recently Viewed tracking ──────────────────────────────────────────────
  // Ref prevents duplicate writes if this component re-renders for the same
  // product.id (e.g. variant selection, quantity change).
  const trackedProductId = useRef<number | null>(null);

  useEffect(() => {
    if (trackedProductId.current === product.id) return;
    trackedProductId.current = product.id;
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url ?? '',
      category: product.category,
    });
  }, [product.id]); // dep: id only — not full object
  // ─────────────────────────────────────────────────────────────────────────

  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)
    : 0;
  const savedAmount = hasDiscount ? product.oldPrice! - product.price : 0;
  // ── Availability ─────────────────────────────────────────────────────────
  // Size-managed products derive everything from per-size inventory; the
  // product-level total is never used to imply that a size is available.
  const sizeAvailability = product.sizeAvailability ?? [];
  const isSizeManaged = sizeAvailability.length > 0;
  const sellableSizes = sizeAvailability.filter((s) => s.status !== 'SOLD_OUT');

  const isOutOfStock = isSizeManaged
    ? sellableSizes.length === 0
    : !product.stock || product.stock === 0;
  const isLowStock = !isSizeManaged && !isOutOfStock && (product.stock ?? 0) <= 5;
  const maxQuantity = isSizeManaged
    ? selectedSize?.available ?? 1
    : product.stock;
  const specs = product.specifications;

  const modelInfo = specs?.modelInfo;
  const sizeWorn = specs?.sizeWorn;

  return (
    <>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}

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
            <li aria-hidden><span className="mx-1">›</span></li>
            {/* Current page — aria-current per WCAG 2.1 SC 2.4.8 */}
            <li aria-current="page" className="text-slate-600 truncate max-w-[14ch]">
              {product.name}
            </li>
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
          <h1 className="font-[family:var(--font-playfair)] text-[1.85rem] lg:text-[2.5rem] font-normal text-slate-900 leading-[1.15] tracking-tight">
            {product.name}
          </h1>
          {product.reviewCount && product.reviewCount > 0 && product.rating ? (
            <div className="mt-2">
              <StarRow rating={product.rating} count={product.reviewCount} />
            </div>
          ) : null}
        </div>

        {/* ── Price row ── */}
        <div className="border-t border-b border-slate-100 py-4 flex flex-col gap-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[1.75rem] font-medium text-slate-900 tabular-nums">
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
                {/* Savings amount — explicit rupee value saves customer mental math */}
                <span className="text-xs text-green-700 font-medium">
                  You save ₹{savedAmount.toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>

          {/* Returns reassurance — inline, always visible */}
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <a href="/return-refund-policy" className="hover:underline">
              Returns accepted within 7 days
            </a>
            {" · "}
            <a href="/exchange-policy" className="hover:underline">
              Size exchange within 4 days
            </a>
            , subject to policy
          </p>

          {/* Shipping copy is derived from the same constant the checkout and
              the order-creation API bill against. This previously read "Free
              shipping on all orders", which is false for any order under the
              threshold — those are charged the flat STANDARD_SHIPPING rate. */}
          <p className="text-[11px] text-slate-400 tracking-wide">
            Inclusive of all taxes · Free shipping on orders above &#8377;
            {SHIPPING_THRESHOLD.toLocaleString('en-IN')}
          </p>

          {/* Availability + Style Code */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {isOutOfStock ? (
              <span className="flex items-center gap-1 text-[11px] text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {isSizeManaged ? 'Sold Out — all sizes' : 'Out of Stock'}
              </span>
            ) : isSizeManaged ? (
              <span className="flex items-center gap-1 text-[11px] text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {sellableSizes.map((s) => s.label).join(' · ')} available
              </span>
            ) : isLowStock ? (
              /* Urgency: pulsing dot + exact count */
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Only {product.stock} left — selling fast
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

        {/* ── Model Info Strip ── */}
        {(modelInfo || sizeWorn) && (
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-sm px-3 py-2.5">
            <svg
              className="w-3.5 h-3.5 text-[#8A5A6A] flex-shrink-0 mt-px"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>
              {modelInfo && <span>{modelInfo}</span>}
              {modelInfo && sizeWorn && <span className="mx-1">·</span>}
              {sizeWorn && <span>Model wears size <strong className="text-slate-700">{sizeWorn}</strong></span>}
            </span>
          </div>
        )}

        {/* ── Size selector + Size Guide affordance ── */}
        {(isSizeManaged || (product.variants && product.variants.length > 0)) && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
                Size
              </p>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-[10px] tracking-[0.12em] uppercase text-[#8A5A6A] underline underline-offset-2 hover:text-[#6e3f50] transition-colors"
              >
                Size Guide
              </button>
            </div>
            <ProductVariantSelector
              variants={product.variants ?? []}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
              sizeAvailability={isSizeManaged ? sizeAvailability : undefined}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
            />
          </div>
        )}

        {/* ── Quantity ── */}
        {!isOutOfStock && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-medium">
              Quantity
            </p>
            <QuantitySelector value={quantity} onChange={setQuantity} max={maxQuantity} />
          </div>
        )}

        {/* ── Action buttons ── */}
        <ProductActions
          product={product}
          quantity={quantity}
          selectedVariant={selectedVariant}
          selectedSize={selectedSize}
          isSizeManaged={isSizeManaged}
        />

        {/* ── Delivery Estimate + Pincode checker — below purchase controls ── */}
        {!isOutOfStock && <DeliveryEstimate />}
        <PincodeChecker />

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
    </>
  );
}
