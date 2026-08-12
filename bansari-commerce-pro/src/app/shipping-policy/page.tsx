export const metadata = {
  title: "Shipping Policy | Bansari Collections",
  description:
    "Shipping and delivery policy for Bansari Collections — order processing, dispatch, and tracking information.",
  alternates: {
    canonical: "https://www.bansaricollection.in/shipping-policy",
  },
};

export default function ShippingPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Shipping Policy</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Bansari Collections ships products across India through our
          courier partners.
        </p>

        <p>
          Orders are generally processed and dispatched within 1–2 business
          days after payment confirmation. Actual delivery time may vary by
          destination, courier service, and circumstances beyond our
          control.
        </p>

        {/* Shipping Charges — documents the rule enforced by
            SHIPPING_THRESHOLD / STANDARD_SHIPPING in src/lib/shipping.ts and
            applied server-side in /api/orders/create. Keep these figures in
            sync with those constants. */}
        <h2 className="pt-2 text-2xl font-semibold text-slate-900">
          Shipping Charges
        </h2>

        <p>
          Orders with a subtotal of ₹2,999 or more are shipped free of charge.
          Orders below ₹2,999 are charged a flat standard shipping fee of ₹99.
          The applicable shipping charge is shown at checkout before payment is
          completed.
        </p>

        <p>
          Customers will receive shipment tracking details by SMS and/or
          email once the order has been dispatched.
        </p>

        <p>
          All orders are prepaid — payment must be completed online at
          checkout before an order is confirmed. We do not currently offer
          cash on delivery.
        </p>

        <p>
          Delays caused by weather conditions, public holidays, courier
          service disruptions, or other circumstances beyond our reasonable
          control are outside our responsibility, though we will do our best
          to keep you informed.
        </p>
      </div>
    </main>
  );
}
