'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';

/**
 * CashfreeButton — Cashfree (LIVE) checkout, the counterpart to RazorpayButton.
 *
 * Payment success is NEVER taken from the browser. The SDK's modal result is
 * ignored as proof; the button always calls /api/payment/cashfree/verify, which
 * confirms the order server-side against Cashfree (order_status = PAID) and
 * persists it. The button only clears the cart and navigates after that
 * server verification returns success.
 *
 * No Cashfree secret is ever referenced here — this component only handles a
 * payment_session_id, which is safe to expose to the browser.
 */

type CustomerDetails = { name: string; email: string; phone: string };
type ShippingDetails = {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

type Props = { customer: CustomerDetails; shipping: ShippingDetails; disabled?: boolean };

type CashfreeInstance = {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

const SDK_SRC = 'https://sdk.cashfree.com/js/v3/cashfree.js';

/** Load the v3 SDK once; resolve when window.Cashfree is available. */
function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.Cashfree) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('SDK load failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SDK load failed'));
    document.head.appendChild(script);
  });
}

export default function CashfreeButton({ customer, shipping, disabled = false }: Props) {
  const router = useRouter();
  const { items, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  // Prevents a second create-order while one checkout is already in flight.
  const activeOrderId = useRef<string | null>(null);

  async function handlePayment() {
    if (loading || items.length === 0 || activeOrderId.current) return;

    try {
      setLoading(true);

      // ── 1. Server creates the Cashfree order (authoritative rupee amount) ──
      const createRes = await fetch('/api/payment/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity, variantId: i.variantId ?? null })),
          customer,
          shipping,
        }),
      });
      const created = await createRes.json();
      if (!created.success || !created.paymentSessionId) {
        throw new Error(created.message ?? 'Unable to create payment order.');
      }

      const orderId: string = created.orderId;
      const mode: 'sandbox' | 'production' = created.mode === 'production' ? 'production' : 'sandbox';
      activeOrderId.current = orderId;

      // ── 2. Launch Cashfree Checkout (modal) ──
      await loadCashfreeSdk();
      if (!window.Cashfree) throw new Error('Cashfree SDK unavailable.');
      const cashfree = window.Cashfree({ mode });
      // The modal result is intentionally not trusted — server verify decides.
      await cashfree.checkout({ paymentSessionId: created.paymentSessionId, redirectTarget: '_modal' });

      // ── 3. Server-side verification (the only proof of payment) ──
      const verifyRes = await fetch('/api/payment/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const verified = await verifyRes.json();

      if (verified.success) {
        clearCart();
        router.push('/order-success');
        return;
      }

      // Not paid / dropped / failed — let the customer retry.
      activeOrderId.current = null;
      setLoading(false);
      alert(verified.message ?? 'Payment was not completed. Please try again.');
    } catch (err) {
      console.error(err);
      activeOrderId.current = null;
      setLoading(false);
      alert(err instanceof Error ? err.message : 'Unable to process payment.');
    }
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={disabled || loading || items.length === 0}
      className="mt-10 flex w-full items-center justify-center rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? 'Processing…' : 'Pay Securely'}
    </button>
  );
}
