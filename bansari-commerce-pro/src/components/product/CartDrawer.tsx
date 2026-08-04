'use client';

/**
 * CartDrawer
 * ──────────
 * Slide-in mini cart that opens when the user successfully adds to cart.
 * Reads directly from the Zustand cart store (same source as Header).
 * Does NOT duplicate or replace any existing cart UI — it is an additional
 * confirmation surface scoped to the PDP add-to-cart flow.
 *
 * Props:
 *   open      – controlled open state (from ProductActions)
 *   onClose   – close callback
 */

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { useCart } from '@/store/cart';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const totalPrice = useCart((s) => s.totalPrice);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={[
          'fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-slate-900">
            Your Cart
            {items.length > 0 && (
              <span className="ml-2 text-[#8A5A6A] font-semibold">{items.length}</span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-sm hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <svg
                className="w-10 h-10 text-slate-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-sm text-slate-400">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {/* Image */}
                <div className="relative w-16 h-20 flex-shrink-0 bg-slate-50 rounded-sm overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-tight truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Qty: {item.quantity}
                  </p>
                  <p className="text-sm text-slate-900 font-light mt-1">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors self-start mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.12em] uppercase text-slate-500">Subtotal</span>
              <span className="text-base font-light text-slate-900">
                ₹{totalPrice().toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Shipping &amp; taxes calculated at checkout</p>

            {/* CTA */}
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full h-12 bg-slate-900 text-white text-sm tracking-[0.12em] uppercase font-medium rounded-sm hover:bg-[#8A5A6A] transition-colors text-center leading-[3rem]"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={onClose}
              className="block w-full text-center text-xs tracking-[0.1em] uppercase text-slate-400 hover:text-slate-700 transition-colors py-1"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
