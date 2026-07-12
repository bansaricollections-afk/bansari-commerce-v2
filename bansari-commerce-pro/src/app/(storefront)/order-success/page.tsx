import Link from "next/link";
import { CheckCircle2, ShoppingBag } from "lucide-react";

export default function OrderSuccessPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <CheckCircle2
          size={90}
          className="text-green-600"
        />

        <h1 className="mt-8 font-[family:var(--font-playfair)] text-5xl font-bold">
          Order Confirmed
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
          Thank you for shopping with Bansari Collections.
          Your order has been placed successfully.
          A confirmation email and order updates will be sent shortly.
        </p>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-2">
          <Link
            href="/shop"
            className="rounded-full border-2 border-[#8A5A6A] py-4 font-semibold text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
          >
            Continue Shopping
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
          >
            <ShoppingBag size={18} />
            Back to Home
          </Link>
        </div>

        <div className="mt-14 w-full rounded-3xl bg-white p-8 text-left shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">
            What happens next?
          </h2>

          <ul className="space-y-3 text-gray-600">
            <li>✓ Order confirmation received</li>
            <li>✓ Quality inspection</li>
            <li>✓ Secure packaging</li>
            <li>✓ Shipment tracking notification</li>
            <li>✓ Delivery to your address</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
