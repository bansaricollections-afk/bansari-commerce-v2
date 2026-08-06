'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';

import type { Product, ProductVariant } from '@/types/product';
import ProductVariantSelector from './ProductVariantSelector';
import QuantitySelector from './QuantitySelector';
import AddToCartButton from './AddToCartButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  /** Product to preview. If null the modal is closed. */
  product: Product | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Focus trap helpers
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, e: globalThis.KeyboardEvent) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ---------------------------------------------------------------------------
// QuickView
// ---------------------------------------------------------------------------

export default function QuickView({ product, onClose }: Props) {
  const open = product !== null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reset internal state when the product changes
  useEffect(() => {
    setSelectedVariant(null);
    setQuantity(1);
  }, [product?.id]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // --- Body scroll lock + focus management ---
  useEffect(() => {
    if (!open) return;

    // Save element that had focus before the modal opened
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into dialog
    const raf = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    // Keyboard: Escape closes, Tab traps focus
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        trapFocus(dialogRef.current, e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
      // Restore focus to the trigger element
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open || !product) return null;

  const primaryImage = product.images?.[0]?.url || '/placeholder.png';
  const hoverImage = product.images?.[1]?.url || primaryImage;

  const originalPrice = (product as any).originalPrice as number | undefined;
  const discountPct =
    originalPrice && originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0;

  const variants: ProductVariant[] = Array.isArray((product as any).variants)
    ? (product as any).variants
    : [];

  const hasVariants = variants.length > 0;
  const requiresVariant = hasVariants && selectedVariant === null;
  const maxQty = selectedVariant?.stock ?? product.stock ?? 99;

  return (
    // Backdrop
    <div
      role="presentation"
      className="fixed inset-0 z-[var(--bc-z-modal,9000)] flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qv-title"
        aria-describedby="qv-desc"
        className="relative w-full sm:max-w-3xl sm:mx-4 bg-white overflow-hidden shadow-2xl"
        style={{
          borderRadius: '0 0 0 0',
          borderTopLeftRadius: '1rem',
          borderTopRightRadius: '1rem',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-slate-500 hover:text-slate-900 hover:bg-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="grid sm:grid-cols-2 min-h-0">
          {/* LEFT — Image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F7F3EE] sm:aspect-auto sm:h-full">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width:640px) 100vw, 50vw"
              className="object-cover object-[center_12%]"
            />
            {/* Hover reveal */}
            <Image
              src={hoverImage}
              alt={`${product.name} — alternate view`}
              fill
              loading="lazy"
              sizes="(max-width:640px) 100vw, 50vw"
              className="absolute inset-0 object-cover object-[center_12%] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </div>

          {/* RIGHT — Info + Actions */}
          <div className="flex flex-col gap-5 p-6 sm:p-8 overflow-y-auto">

            {/* Collection eyebrow */}
            {product.collection && (
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8A5A6A]">
                {product.collection}
              </p>
            )}

            {/* Title */}
            <h2
              id="qv-title"
              className="font-[family:var(--font-playfair)] text-[1.45rem] font-normal leading-snug text-slate-900"
            >
              {product.name}
            </h2>

            {/* Price row */}
            <div id="qv-desc" className="flex items-baseline gap-2.5">
              <span className="text-lg font-semibold tabular-nums text-slate-900">
                &#x20B9;{product.price.toLocaleString('en-IN')}
              </span>
              {discountPct > 0 && originalPrice && (
                <>
                  <span className="text-sm tabular-nums text-slate-400 line-through">
                    &#x20B9;{originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-[#8A5A6A]">
                    {discountPct}% off
                  </span>
                </>
              )}
            </div>

            {/* Variant selector */}
            {hasVariants && (
              <ProductVariantSelector
                variants={variants}
                selected={selectedVariant}
                onSelect={setSelectedVariant}
              />
            )}

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3">
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={maxQty}
              />
              <AddToCartButton
                product={product}
                quantity={quantity}
                variant={selectedVariant}
                className="flex-1 h-11"
              />
            </div>

            {/* Variant required notice */}
            {requiresVariant && (
              <p role="alert" className="text-xs font-medium text-rose-600 -mt-2">
                Please select a size.
              </p>
            )}

            {/* Separator */}
            <hr className="border-slate-100" />

            {/* View full details */}
            <Link
              href={`/product/${product.id}`}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900 transition-colors duration-150 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
              onClick={onClose}
            >
              View full details
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
