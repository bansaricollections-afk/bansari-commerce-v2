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
