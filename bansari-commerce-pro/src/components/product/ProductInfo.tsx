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
  const dialogRef      = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes the guide. The listener is scoped to the modal's own
  // lifetime — it mounts with the modal and is removed on unmount, so there is
  // no always-on global handler. It only calls onClose; no selection, size,
  // quantity or cart state is touched.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /**
   * Focus management, matching the MobileFilterBar pattern. This modal is
   * conditionally rendered, so it unmounts on close and needs no
   * inert/aria-hidden handling. On mount, focus moves to the Close button;
   * Tab and Shift+Tab cycle within the dialog; on unmount, focus returns to
   * the Size Guide button that opened it. DOM focus only — no size, variant,
   * availability or cart state is read or written.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
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
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close size guide"
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
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

      {/*
       * Vertical rhythm is set per block rather than by a single uniform
       * `gap`, so tightly-bound pairs (collection → title, title → price) sit
       * close and genuine section breaks carry the space. The old uniform
       * gap-6 spaced a one-line eyebrow exactly like a purchase panel, which
       * is where most of the dead space on this column came from.
       */}
      <div className="flex flex-col lg:sticky lg:top-24 lg:self-start">

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
                  {/* Category filter on /shop, not /collections/{slug} — that
                      route does not exist and returned 404 on every PDP. The
                      value must be the raw stored category: getFilteredProducts
                      matches with .eq('category', …), which is exact and
                      case-sensitive, so lowercasing or hyphenating it yields a
                      200 with zero products (a soft 404). Encode only. */}
                  <Link
                    href={`/shop?category=${encodeURIComponent(product.category)}`}
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
          <p className="mt-5 text-[10px] tracking-[0.24em] uppercase text-[#8A5A6A] font-semibold">
            {product.collection}
          </p>
        )}

        {/*
         * ── Product name ──
         * Scale pulled back from 2.5rem and capped to a ~22ch measure: at the
         * old size a three-word product name outweighed the price and the
         * purchase controls beneath it.
         */}
        {/* `.bc-serif`, not `font-[family:var(--font-playfair)]`: Tailwind v4's
            font-family type hint is `family-name`, so the `family:` form
            generated no rule and this title rendered in the inherited sans. */}
        {/* Underscores are Tailwind's escape for spaces in an arbitrary value.
            They are required here: CSS only accepts `+` inside clamp() when it
            is surrounded by whitespace, so the unspaced form parses to nothing
            and the heading silently falls back to the inherited size.

            Scale: 20px at 375px → 31px ceiling. The ceiling sits one step under
            the price's 32px so the price stays the dominant element in the
            panel; the title is also font-normal against the price's
            font-medium, which widens that gap further. */}
        <h1 className="bc-serif mt-2 max-w-[24ch] text-[clamp(1.25rem,0.95rem_+_1.3vw,1.9375rem)] font-normal text-slate-900 leading-[1.2] tracking-[-0.01em]">
          {product.name}
        </h1>
        {product.reviewCount && product.reviewCount > 0 && product.rating ? (
          <div className="mt-2.5">
            <StarRow rating={product.rating} count={product.reviewCount} />
          </div>
        ) : null}

        {/* ── Price ── */}
        <div className="mt-5 flex items-baseline gap-3 flex-wrap">
          <span className="text-[2rem] leading-none font-medium text-slate-900 tabular-nums tracking-[-0.015em]">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[0.9375rem] text-slate-400 line-through font-light tabular-nums">
                ₹{product.oldPrice!.toLocaleString('en-IN')}
              </span>
              {/* Discount is a plain typographic mark sitting on the price
                  baseline — no chip, no border, no tag. Gold token rather than
                  --bc-gold itself: #C9A96E does not carry enough contrast on
                  cream for text this small, and --bc-gold-dark is the palette's
                  designated legible gold. Calculation is untouched. */}
              <span
                className="text-[0.9375rem] font-medium tabular-nums tracking-[0.01em]"
                style={{ color: "var(--bc-gold-dark)" }}
              >
                &minus;{discountPct}%
              </span>
            </>
          )}
        </div>
        {hasDiscount && (
          /* Savings amount — explicit rupee value saves customer mental math */
          <p className="mt-2 text-[12px] text-slate-500">
            You save ₹{savedAmount.toLocaleString('en-IN')}
          </p>
        )}

        {/* ── Shipping / returns ── */}
        {/* Shipping copy is derived from the same constant the checkout and
            the order-creation API bill against. This previously read "Free
            shipping on all orders", which is false for any order under the
            threshold — those are charged the flat STANDARD_SHIPPING rate. */}
        <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-4 text-[12px] leading-relaxed text-slate-500">
          <p>
            Inclusive of all taxes · Free shipping on orders above &#8377;
            {SHIPPING_THRESHOLD.toLocaleString('en-IN')}
          </p>
          <p>
            <a href="/return-refund-policy" className="text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-600 transition-colors">
              Returns within 7 days
            </a>
            {' · '}
            <a href="/exchange-policy" className="text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-600 transition-colors">
              Size exchange within 4 days
            </a>
            , subject to policy
          </p>
        </div>

        {/*
         * ── Real availability ──
         * Promoted out of the old four-item meta cluster into its own line so
         * the one piece of genuinely decision-changing information on this
         * panel is legible at a glance. The values themselves are unchanged —
         * still derived from per-size inventory for size-managed products and
         * never from a product-level total.
         */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {isOutOfStock ? (
            <span className="flex items-center gap-2 text-[13px] font-medium text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
              {isSizeManaged ? 'Sold Out — all sizes' : 'Out of Stock'}
            </span>
          ) : isSizeManaged ? (
            <span className="flex items-center gap-2 text-[13px] text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block flex-shrink-0" />
              <span>
                <strong className="font-medium text-slate-900">
                  {sellableSizes.map((s) => s.label).join(' · ')}
                </strong>{' '}
                available
              </span>
            </span>
          ) : isLowStock ? (
            /* Urgency: pulsing dot + exact count */
            <span className="flex items-center gap-2 text-[13px] font-medium text-amber-700">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Only {product.stock} left — selling fast
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[13px] text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block flex-shrink-0" />
              In Stock
            </span>
          )}
          {(product.sku || product.styleCode) && (
            <span className="text-[11px] tracking-[0.08em] text-slate-400">
              Style {product.styleCode ?? product.sku}
            </span>
          )}
        </div>

        {/* ── Model Info Strip ── */}
        {(modelInfo || sizeWorn) && (
          <p className="mt-3 flex items-start gap-2 text-[12px] text-slate-500">
            <svg
              className="w-3.5 h-3.5 text-[#8A5A6A] flex-shrink-0 mt-0.5"
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
              {sizeWorn && <span>Model wears size <strong className="font-medium text-slate-700">{sizeWorn}</strong></span>}
            </span>
          </p>
        )}

        {/* ── Size selector + Size Guide affordance ── */}
        {(isSizeManaged || (product.variants && product.variants.length > 0)) && (
          <div className="mt-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] tracking-[0.2em] uppercase text-slate-900 font-semibold">
                Select Size
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
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.2em] uppercase text-slate-900 font-semibold">
              Quantity
            </p>
            <QuantitySelector value={quantity} onChange={setQuantity} max={maxQuantity} />
          </div>
        )}

        {/* ── Purchase actions ── */}
        <div className="mt-7">
          <ProductActions
            product={product}
            quantity={quantity}
            selectedVariant={selectedVariant}
            selectedSize={selectedSize}
            isSizeManaged={isSizeManaged}
          />
        </div>

        {/* ── Delivery Estimate + Pincode checker — below purchase controls ── */}
        <div className="mt-7 flex flex-col gap-4">
          {!isOutOfStock && <DeliveryEstimate />}
          <PincodeChecker />
        </div>

        {/* ── Quick spec pills ── */}
        {specs && (
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3.5 pt-6 border-t border-slate-100">
            {specs.fabric && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Fabric</p>
                <p className="text-sm text-slate-800 font-normal">{specs.fabric}</p>
              </div>
            )}
            {specs.occasion && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Occasion</p>
                <p className="text-sm text-slate-800 font-normal">
                  {Array.isArray(specs.occasion) ? specs.occasion.join(', ') : specs.occasion}
                </p>
              </div>
            )}
            {specs.fit && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Fit</p>
                <p className="text-sm text-slate-800 font-normal">{specs.fit}</p>
              </div>
            )}
            {specs.neckline && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Neckline</p>
                <p className="text-sm text-slate-800 font-normal">{specs.neckline}</p>
              </div>
            )}
            {specs.sleeve && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Sleeve</p>
                <p className="text-sm text-slate-800 font-normal">{specs.sleeve}</p>
              </div>
            )}
            {specs.work && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">Work</p>
                <p className="text-sm text-slate-800 font-normal">{specs.work}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
