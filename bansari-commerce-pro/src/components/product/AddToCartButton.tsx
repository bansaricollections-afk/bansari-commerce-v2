'use client';

import { useState } from 'react';

import { useCart } from '@/hooks/useCart';
import type { Product, ProductVariant } from '@/types/product';

interface Props {
  product: Product;
  quantity?: number;
  variant?: ProductVariant | null;
  className?: string;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  variant = null,
  className = '',
}: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const isOutOfStock = product.stock === 0;

  const handleClick = () => {
    if (isOutOfStock) return;
    addToCart({ product, quantity, variant });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isOutOfStock}
      aria-label={isOutOfStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}
      className={`h-11 px-6 text-xs tracking-[0.12em] uppercase font-medium rounded-sm transition-all duration-200 ${
        isOutOfStock
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : added
          ? 'bg-green-700 text-white'
          : 'bg-slate-900 text-white hover:bg-[#8A5A6A]'
      } ${className}`}
    >
      {added ? 'Added ✓' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
    </button>
  );
}
