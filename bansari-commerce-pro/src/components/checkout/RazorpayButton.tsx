'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackPurchase } from '@/analytics/events';
import { useCart } from '@/store/cart';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
};

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

type Props = {
  customer: CustomerDetails;
  shipping: ShippingDetails;
  disabled?: boolean;
};

export default function RazorpayButton({ customer, shipping, disabled = false }: Props) {
  const router = useRouter();
  const { items, clearCart } = useCart();

  // Prevent double-submit: true while any payment operation is in flight.
  const [loading, setLoading] = useState(false);
  // Store the active Razorpay order id so we can detect retries and skip
  // creating a second Razorpay order if the modal was already opened.
  const activeRzpOrderId = useRef<string | null>(null);
  // purchase is a once-per-mount event: this guard mirrors the server-side
  // idempotency so a retried save can never double-count revenue.
  const purchaseTracked = useRef(false);

  async function handlePayment() {
    if (loading || items.length === 0) return;

    try {
      setLoading(true);

      let rzpOrderId: string;
      let rzpAmount: number;
      let rzpCurrency: string;

      if (activeRzpOrderId.current) {
        // User pressed Pay a second time while the modal was alive — do not
        // create a new Razorpay order.  Re-open is not supported by the SDK
        // once the modal is dismissed, so this guard only prevents the
        // create-order call from firing twice on fast double-clicks.
        setLoading(false);
        return;
      }

      // --- Step 1: Create Razorpay order (server computes amount) ---
      // Customer + shipping are sent NOW so pending_orders can store them
      // for webhook recovery BEFORE the Razorpay modal opens.
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity, variantId: i.variantId ?? null })),
          customer,
          shipping,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success) {
        throw new Error(orderData.message ?? 'Unable to create payment order.');
      }

      rzpOrderId = orderData.order.id;
      rzpAmount = orderData.order.amount;
      rzpCurrency = orderData.order.currency;

      activeRzpOrderId.current = rzpOrderId;

      // --- Step 2: Open Razorpay modal ---
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpAmount,       // authoritative — set by server
        currency: rzpCurrency,
        name: 'Bansari Collections',
        description: 'Order Payment',
        order_id: rzpOrderId,
        theme: { color: '#8A5A6A' },
        modal: {
          ondismiss() {
            // Allow re-attempt after dismissal by clearing the guard.
            activeRzpOrderId.current = null;
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // --- Step 3: Verify signature ---
            const verifyRes = await fetch('/api/payment/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            const verify = await verifyRes.json();
            if (!verify.success) {
              alert('Payment verification failed.');
              activeRzpOrderId.current = null;
              setLoading(false);
              return;
            }

            // --- Step 4: Create order in DB ---
            // razorpayOrderId is the idempotency key: the DB UNIQUE index on
            // razorpay_payment_id prevents duplicate rows even if this request
            // fires more than once.
            const saveRes = await fetch('/api/orders/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: items.map((i) => ({ productId: i.id, quantity: i.quantity, variantId: i.variantId ?? null })),
                customer,
                shipping,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const saved = await saveRes.json();

            if (!saved.success) {
              // 409 = already exists (idempotency: webhook beat the browser)
              if (saveRes.status === 409) {
                clearCart();
                router.push('/order-success');
                return;
              }
              alert(saved.error ?? 'Order save failed.');
              activeRzpOrderId.current = null;
              setLoading(false);
              return;
            }

            /*
             * purchase — the only confirmed-success point in the flow. Reached
             * solely after the signature verified (step 3) AND the order was
             * committed server-side (saved.success), which also covers the
             * idempotent replay the API returns at 200 when the webhook won
             * the race. Opening the modal, creating the Razorpay order and the
             * 409 branch above deliberately do not fire it.
             *
             * value comes from the server-authoritative rzpAmount (paise), not
             * from any client-side cart total. Email and phone are passed only
             * for Google Ads Enhanced Conversions, which is off unless
             * NEXT_PUBLIC_GOOGLE_ADS_ENHANCED_CONVERSIONS is explicitly set;
             * no payment detail or Razorpay signature is ever sent.
             */
            if (!purchaseTracked.current) {
              purchaseTracked.current = true;

              /*
               * One call, every destination — Vercel Analytics, GA4, the Meta
               * Pixel and the Google Ads conversion. Previously each was
               * written out here by hand, which is how CashfreeButton ended up
               * with a Meta Purchase but no Vercel one.
               *
               * transactionId is razorpay_order_id: the only identifier
               * available both here and in the Razorpay webhook, and it
               * carries a UNIQUE index. order_number is unusable because the
               * webhook can fire before the order row exists. The server-side
               * Conversions API Purchase uses this same id as its event_id, so
               * Meta collapses the browser and server events into one
               * conversion instead of counting the revenue twice.
               *
               * value comes from the server-authoritative rzpAmount (paise),
               * never from a client-side cart total.
               */
              trackPurchase({
                transactionId: response.razorpay_order_id,
                value: rzpAmount / 100,
                currency: rzpCurrency,
                items: items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                })),
                customer: { email: customer.email, phone: customer.phone },
              });

            }

            clearCart();
            router.push('/order-success');
          } catch (err) {
            console.error(err);
            alert('Unable to complete your order. Please contact support.');
            activeRzpOrderId.current = null;
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      // Loading stays true until modal dismisses or order saves.
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Unable to initiate payment.');
      activeRzpOrderId.current = null;
      setLoading(false);
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
