'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metaTrack } from '@/analytics/meta-pixel';
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

    /*
     * Once the Cashfree modal has closed, money may already have moved. From
     * that point on nothing may re-arm the button: a retry mints a NEW Cashfree
     * order and charges the customer a second time for the same cart.
     */
    let checkoutClosed = false;

    /** Payment may have succeeded but we could not confirm it. Stay locked. */
    function lockPendingConfirmation() {
      // setLoading stays true so the button remains visibly disabled.
      alert(
        'Your payment may have been completed. Please do NOT pay again — ' +
        'we are confirming it and will email your order confirmation shortly. ' +
        'Contact us if you do not hear back.'
      );
    }

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
      checkoutClosed = true;

      // ── 3. Server-side verification (the only proof of payment) ──
      const verifyRes = await fetch('/api/payment/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const verified = await verifyRes.json();

      if (verified.success) {
        /*
         * Purchase was fired on the Razorpay path but never here, so since
         * production switched to Cashfree the pixel has recorded no conversions
         * at all — Meta could only optimise toward traffic, not buyers.
         *
         * Fired before clearCart(), which empties `items`. `value` is the
         * server-computed amount returned by create-order, so it matches what
         * was actually charged including shipping.
         *
         * eventID is the Cashfree order id so a later server-side Conversions
         * API event can deduplicate against this one.
         *
         * Catalogue facts and totals only — no name, email, phone, address or
         * payment detail.
         */
        metaTrack(
          'Purchase',
          {
            content_type: 'product',
            content_ids: items.map((i) => String(i.id)),
            contents: items.map((i) => ({
              id: String(i.id),
              quantity: i.quantity,
              item_price: i.price,
            })),
            num_items: items.reduce((n, i) => n + i.quantity, 0),
            value: typeof created.amount === 'number' ? created.amount : undefined,
            currency: created.currency ?? 'INR',
          },
          orderId
        );

        clearCart();
        router.push('/order-success');
        return;
      }

      /*
       * A 5xx means the server could not establish or record the outcome — it
       * does NOT mean the customer did not pay. Previously every failure was
       * treated as "not paid", which released the guard and let a second
       * Cashfree order be created for an already-paid cart. The webhook is the
       * authoritative reconciliation path and is idempotent, so the safe move
       * is to stop and let it settle.
       */
      if (verifyRes.status >= 500) {
        lockPendingConfirmation();
        return;
      }

      // 4xx: Cashfree itself reports the payment did not complete — safe to retry.
      activeOrderId.current = null;
      setLoading(false);
      alert(verified.message ?? 'Payment was not completed. Please try again.');
    } catch (err) {
      console.error(err);

      // Thrown after the modal closed (network drop, bad JSON): outcome unknown,
      // money may have moved. Never re-arm.
      if (checkoutClosed) {
        lockPendingConfirmation();
        return;
      }

      // Failed before the modal ever opened — nothing was charged.
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
