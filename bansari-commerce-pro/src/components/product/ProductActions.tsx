'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  trackViewItem,
  trackAddToCart,
  trackWhatsAppEnquiry,
  type CommerceItem,
} from '@/analytics/events';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import type { Product, ProductVariant, SizeAvailability } from '@/types/product';

import CartDrawer from './CartDrawer';
import NotifyMe from './NotifyMe';
import CouponBanner from '@/components/coupon/CouponBanner';

interface Props {
  product: Product;
  quantity: number;
  selectedVariant: ProductVariant | null;
  /** Selected size for size-managed products — carries the purchased variant. */
  selectedSize?: SizeAvailability | null;
  isSizeManaged?: boolean;
}

/** Maps the selected size onto the cart's variant identity. */
function toCartSize(size: SizeAvailability | null) {
  return size ? { variantId: size.variantId, label: size.label, sku: size.sku } : null;
}

/**
 * Analytics identity for a product — one mapper, consumed by every
 * destination. The per-vendor payload shapes (Vercel's flat scalars, GA4's
 * items[], Meta's content_ids) now live together in src/analytics/events.ts,
 * so this component no longer maintains a builder per vendor.
 *
 * Deliberately contains no PII — only catalogue facts already public on the
 * page.
 *
 * `id` is product.id rather than sku: CartItem carries only variantSku (the
 * size-level code), so a sku-keyed id would report "BC-…-001" from the PDP and
 * "BC-…-001-M" from Purchase — two identities for one product, which breaks
 * funnel reporting and catalogue matching. product.id is the one identifier
 * present and identical at every event point.
 */
function toCommerceItem(product: Product, quantity = 1): CommerceItem {
  return {
    id: product.id,
    name: product.name,
    category: product.category ?? null,
    price: product.price,
    quantity,
  };
}

export default function ProductActions({
  product,
  quantity,
  selectedVariant,
  selectedSize = null,
  isSizeManaged = false,
}: Props) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const router = useRouter();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sizeWarningShake, setSizeWarningShake] = useState(false);

  const inWishlist = isInWishlist(product.id);

  /*
   * view_item — top of the funnel. This component is the PDP's only client
   * entry point (rendered exactly once, from ProductInfo), so the event fires
   * once per product view without needing a separate client wrapper. The PDP
   * route itself is a server component and cannot call track().
   */
  useEffect(() => {
    trackViewItem(toCommerceItem(product));
  }, [product]);

  const sizeAvailability = product.sizeAvailability ?? [];
  const hasSellableSize = sizeAvailability.some((s) => s.status !== 'SOLD_OUT');

  // Size-managed products are only out of stock when EVERY size is sold out.
  const isOutOfStock = isSizeManaged
    ? !hasSellableSize
    : !product.stock || product.stock === 0;

  const requiresSizeSelection = isSizeManaged
    ? selectedSize === null || selectedSize.status === 'SOLD_OUT'
    : Array.isArray((product as any).variants) &&
      (product as any).variants.length > 0 &&
      selectedVariant === null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (requiresSizeSelection) {
      // Trigger shake animation to draw attention to the warning
      setSizeWarningShake(false);
      requestAnimationFrame(() => setSizeWarningShake(true));
      setTimeout(() => setSizeWarningShake(false), 400);
      return;
    }
    addToCart({ product, quantity, variant: selectedVariant, size: toCartSize(selectedSize) });
    trackAddToCart(toCommerceItem(product, quantity));
    setAddedToCart(true);
    setCartDrawerOpen(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (requiresSizeSelection) {
      setSizeWarningShake(false);
      requestAnimationFrame(() => setSizeWarningShake(true));
      setTimeout(() => setSizeWarningShake(false), 400);
      return;
    }
    // Buy Now genuinely adds the line to the cart before navigating, so it is
    // a real add_to_cart. begin_checkout is fired by the checkout page itself.
    addToCart({ product, quantity, variant: selectedVariant, size: toCartSize(selectedSize) });
    trackAddToCart(toCommerceItem(product, quantity));
    router.push('/checkout');
  };

  const whatsappMessage = encodeURIComponent(
    `Hi! I'm interested in: ${product.name} (SKU: ${product.sku ?? product.id}) — ₹${product.price.toLocaleString('en-IN')}. Can you help me?`
  );
  const whatsappUrl = `https://wa.me/918460192745?text=${whatsappMessage}`;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      await navigator.share({ title: product.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const hasDiscount = product.oldPrice && product.oldPrice > product.price;

  return (
    <>
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      <div className="flex flex-col gap-3">
        {/* Size selection required notice — shakes on invalid attempt */}
        {requiresSizeSelection && (
          <p
            role="alert"
            className={[
              'text-xs font-medium tracking-wide text-red-500 transition-all',
              sizeWarningShake
                ? '[animation:shake_0.35s_ease-in-out]'
                : '',
            ].join(' ')}
            style={sizeWarningShake ? {
              animation: 'shake 0.35s ease-in-out',
            } : {}}
          >
            Please select a size to continue.
          </p>
        )}

        {/* Out-of-stock: Notify Me replaces CTA row */}
        {isOutOfStock ? (
          <NotifyMe productId={product.id} productName={product.name} />
        ) : (
          <>
            {/*
             * Compact offer line above the CTA. No subtotal is passed: on a
             * product page there is no cart to measure against, so the banner
             * states the offer without promising eligibility it cannot check.
             */}
            <div className="mb-3">
              <CouponBanner variant="compact" />
            </div>

            {/*
             * Purchase hierarchy is now explicit rather than flat. Add to Cart
             * is the single dominant action (solid ink, tallest target); Buy
             * Now sits directly beneath it as a clearly-secondary outlined
             * action. Previously both were solid and equally weighted, which
             * left the panel with no primary. Handlers are unchanged.
             */}
            <button
              onClick={handleAddToCart}
              aria-label={requiresSizeSelection ? 'Select a size first' : 'Add to cart'}
              className={`w-full text-sm tracking-[0.16em] uppercase font-semibold transition-all duration-200 ${
                requiresSizeSelection
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : addedToCart
                  ? 'bg-emerald-800 text-white'
                  : 'bg-[#1A0F16] text-[#FFFDF9] hover:bg-[#2C1A24]'
              }`}
              style={{ height: 58 }}
            >
              {addedToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Added to Cart
                </span>
              ) : (
                'Add to Cart'
              )}
            </button>

            <button
              onClick={handleBuyNow}
              aria-label={requiresSizeSelection ? 'Select a size first' : 'Buy now'}
              className={`w-full text-sm tracking-[0.16em] uppercase font-medium transition-all duration-200 ${
                requiresSizeSelection
                  ? 'border border-slate-200 bg-white text-slate-400 cursor-not-allowed'
                  : 'border border-[#8A5A6A] bg-white text-[#8A5A6A] hover:bg-[#8A5A6A] hover:text-white'
              }`}
              style={{ height: 50 }}
            >
              Buy Now
            </button>
          </>
        )}

        {/*
         * Secondary actions — wishlist / share / WhatsApp as one understated
         * text row beneath the purchase block. WhatsApp was a full-width
         * green-bordered button competing with the real CTAs; as a text link
         * it stays reachable without claiming purchase-level weight.
         *
         * Visibility conditions are deliberately identical to before this
         * visual pass: wishlist and share render only when the product is
         * purchasable (they previously sat inside the in-stock CTA branch),
         * WhatsApp renders unconditionally. Only placement and styling moved.
         */}
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[11px] tracking-[0.12em] uppercase text-slate-500">
          {!isOutOfStock && (
            <>
              <button
                onClick={() => toggleWishlist(product.id)}
                aria-pressed={inWishlist}
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  inWishlist ? 'text-[#8A5A6A]' : 'hover:text-slate-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                {inWishlist ? 'Wishlisted' : 'Wishlist'}
              </button>

              <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors duration-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                {shareCopied ? 'Copied!' : 'Share'}
              </button>
            </>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppEnquiry(toCommerceItem(product), 'pdp')}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors duration-200"
            aria-label="Enquire on WhatsApp"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enquire on WhatsApp
          </a>
        </div>

        {/*
         * Sticky mobile bottom bar
         * Now includes price on the left so customers see the price
         * before tapping a CTA without needing to scroll.
         */}
        {!isOutOfStock && (
          /* bottom is offset by the cookie notice's height while it is on
             screen. That notice is z-toast and would otherwise sit on top of
             this bar, hiding Add to Cart from first-time mobile visitors —
             i.e. exactly the ad traffic that lands on a product page. The
             variable is unset once a choice is made, so this returns to 0. */
          <div
            className="fixed left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden"
            style={{ bottom: 'var(--bc-consent-offset, 0px)' }}
          >
            {/* Narrow-screen fit: at 320px the old `gap-3 px-4` with a
                `min-w-0` price column left ~72px per button, so the price
                could compress and the CTA labels wrapped. The price column is
                now flex-shrink-0 + nowrap (it is the one element that must
                never reflow), and the gaps/padding/tracking step up only from
                the `sm` breakpoint. */}
            <div className="flex items-center gap-1.5 sm:gap-3 max-w-lg mx-auto px-3 sm:px-4 py-3">
              {/* Price column */}
              <div className="flex flex-col flex-shrink-0">
                <span className="text-[15px] sm:text-base font-medium text-slate-900 leading-tight whitespace-nowrap tabular-nums">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] text-slate-400 line-through leading-tight whitespace-nowrap tabular-nums">
                    ₹{product.oldPrice!.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Wishlist */}
              <button
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                className={`h-12 w-11 sm:w-12 flex items-center justify-center border flex-shrink-0 ${
                  inWishlist ? 'border-[#8A5A6A] text-[#8A5A6A]' : 'border-slate-200 text-slate-500'
                }`}
              >
                <svg className="w-5 h-5" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>

              {/* Buy Now — secondary in sticky bar */}
              <button
                onClick={handleBuyNow}
                className="flex-1 min-w-[68px] h-12 px-1 whitespace-nowrap text-[11px] sm:text-[13px] tracking-[0.04em] sm:tracking-[0.12em] uppercase font-medium transition-all duration-200 border border-[#8A5A6A] bg-white text-[#8A5A6A]"
              >
                Buy Now
              </button>

              {/* Add to Cart — primary in sticky bar, matching the desktop panel */}
              <button
                onClick={handleAddToCart}
                disabled={false}
                className={`flex-1 min-w-[90px] h-12 px-1 whitespace-nowrap text-[11px] sm:text-[13px] tracking-[0.04em] sm:tracking-[0.12em] uppercase font-semibold transition-all duration-200 ${
                  addedToCart
                    ? 'bg-emerald-800 text-white'
                    : 'bg-[#1A0F16] text-[#FFFDF9]'
                }`}
              >
                {addedToCart ? 'Added ✓' : 'Add to Cart'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shake keyframe injected inline so no global CSS file is needed */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-4px); }
          40%       { transform: translateX(4px); }
          60%       { transform: translateX(-3px); }
          80%       { transform: translateX(3px); }
        }
      `}</style>
    </>
  );
}
