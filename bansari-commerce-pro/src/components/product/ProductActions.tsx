'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import type { Product, ProductVariant } from '@/types/product';

interface Props {
  product: Product;
  quantity: number;
  selectedVariant: ProductVariant | null;
}

export default function ProductActions({ product, quantity, selectedVariant }: Props) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const router = useRouter();
  const [addedToCart, setAddedToCart] = useState(false);
  const inWishlist = isInWishlist(product.id);
  const isOutOfStock = product.stock === 0;

  // Size selection is required when the product has variants (sizes)
  const requiresSizeSelection =
    Array.isArray((product as any).variants) &&
    (product as any).variants.length > 0 &&
    selectedVariant === null;

  const handleAddToCart = () => {
    if (isOutOfStock || requiresSizeSelection) return;
    addToCart({ product, quantity, variant: selectedVariant });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock || requiresSizeSelection) return;
    addToCart({ product, quantity, variant: selectedVariant });
    router.push('/checkout');
  };

  const whatsappMessage = encodeURIComponent(
    `Hi! I'm interested in: ${product.name} (SKU: ${product.sku ?? product.id}) — ₹${product.price.toLocaleString('en-IN')}. Can you help me?`
  );
  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappMessage}`;

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Size selection required notice */}
      {requiresSizeSelection && (
        <p
          role="alert"
          className="text-xs font-medium tracking-wide text-red-500"
        >
          Please select a size.
        </p>
      )}

      {/* Primary CTAs */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || requiresSizeSelection}
          aria-label={isOutOfStock ? 'Out of stock' : requiresSizeSelection ? 'Select a size first' : 'Add to cart'}
          className={`flex-1 h-12 text-sm tracking-[0.12em] uppercase font-medium transition-all duration-200 rounded-sm ${
            isOutOfStock || requiresSizeSelection
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : addedToCart
              ? 'bg-green-700 text-white'
              : 'bg-slate-900 text-white hover:bg-[#8A5A6A]'
          }`}
        >
          {addedToCart ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Added
            </span>
          ) : isOutOfStock ? (
            'Out of Stock'
          ) : (
            'Add to Cart'
          )}
        </button>

        <button
          onClick={() => toggleWishlist(product.id)}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={inWishlist}
          className={`h-12 w-12 flex items-center justify-center border rounded-sm transition-all duration-200 flex-shrink-0 ${
            inWishlist
              ? 'border-[#8A5A6A] bg-[#8A5A6A]/5 text-[#8A5A6A]'
              : 'border-slate-200 text-slate-500 hover:border-[#8A5A6A] hover:text-[#8A5A6A]'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={inWishlist ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        <button
          onClick={handleShare}
          aria-label="Share product"
          className="h-12 w-12 flex items-center justify-center border border-slate-200 rounded-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all duration-200 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </button>
      </div>

      {/* Buy Now */}
      {!isOutOfStock && (
        <button
          onClick={handleBuyNow}
          disabled={requiresSizeSelection}
          className={`w-full h-12 text-sm tracking-[0.12em] uppercase font-medium border rounded-sm transition-all duration-200 ${
            requiresSizeSelection
              ? 'border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white'
          }`}
        >
          Buy Now
        </button>
      )}

      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-11 text-xs tracking-[0.12em] uppercase font-medium text-green-700 border border-green-200 rounded-sm hover:bg-green-50 transition-all duration-200"
        aria-label="Enquire on WhatsApp"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Enquire on WhatsApp
      </a>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-slate-200 lg:hidden">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={() => toggleWishlist(product.id)}
            aria-label="Wishlist"
            className={`h-12 w-12 flex items-center justify-center border rounded-sm flex-shrink-0 ${
              inWishlist ? 'border-[#8A5A6A] text-[#8A5A6A]' : 'border-slate-200 text-slate-500'
            }`}
          >
            <svg className="w-5 h-5" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || requiresSizeSelection}
            className={`flex-1 h-12 text-sm tracking-[0.12em] uppercase font-medium rounded-sm transition-all duration-200 ${
              isOutOfStock || requiresSizeSelection
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : addedToCart
                ? 'bg-green-700 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            {addedToCart ? 'Added ✓' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          {!isOutOfStock && (
            <button
              onClick={handleBuyNow}
              disabled={requiresSizeSelection}
              className={`flex-1 h-12 text-sm tracking-[0.12em] uppercase font-medium rounded-sm transition-all duration-200 ${
                requiresSizeSelection
                  ? 'bg-slate-300 text-slate-400 cursor-not-allowed'
                  : 'bg-[#8A5A6A] text-white'
              }`}
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
