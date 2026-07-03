"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/store/cart";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export default function RazorpayButton() {
  const router = useRouter();

  const {
    items,
    totalPrice,
    clearCart,
  } = useCart();

  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    try {
      setLoading(true);

      const amount = totalPrice();

      const orderResponse = await fetch(
        "/api/payment/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error("Unable to create payment order.");
      }

      const order = orderData.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount: order.amount,

        currency: order.currency,

        name: "Bansari Collections",

        description: "Order Payment",

        order_id: order.id,

        theme: {
          color: "#8A5A6A",
        },

        modal: {
          ondismiss() {
            alert("Payment cancelled.");
          },
        },

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyResponse = await fetch(
              "/api/payment/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(response),
              }
            );

            const verify = await verifyResponse.json();

            if (!verify.success) {
              alert("Payment verification failed.");
              return;
            }

            const saveResponse = await fetch(
              "/api/orders/create",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  customerId: "guest",

                  orderNumber: `BC-${Date.now()}`,

                  items,

                  subtotal: amount,

                  shipping: amount >= 2999 ? 0 : 99,

                  tax: 0,

                  discount: 0,

                  total:
                    amount +
                    (amount >= 2999 ? 0 : 99),

                  paymentStatus: "Paid",

                  orderStatus: "Placed",
                }),
              }
            );

            const saveOrder = await saveResponse.json();

            if (!saveOrder.success) {
              alert("Order saved failed.");
              return;
            }

            clearCart();

            router.push("/order-success");
          } catch (error) {
            console.error(error);

            alert("Unable to complete your order.");
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      console.error(error);

      alert("Unable to initiate payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={loading || items.length === 0}
      className="mt-10 flex w-full items-center justify-center rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Processing..." : "Pay Securely"}
    </button>
  );
}