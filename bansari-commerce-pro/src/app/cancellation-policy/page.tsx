export const metadata = {
  title: "Cancellation Policy",
  description:
    "Order cancellation policy for Bansari Collections — cancel before dispatch for a full refund to your original payment method.",
  alternates: {
    canonical: "https://www.bansaricollection.in/cancellation-policy",
  },
};

export default function CancellationPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Cancellation Policy</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Orders can be cancelled free of charge any time before they are
          packed or dispatched from our warehouse. To request a
          cancellation, contact our customer support team as soon as possible
          after placing your order, quoting your order number.
        </p>

        <p>
          Once an order has been dispatched, it can no longer be cancelled.
          If you no longer want the product after it has been dispatched or
          delivered, please refer to our{" "}
          <a href="/return-refund-policy" className="underline">
            Return &amp; Refund Policy
          </a>{" "}
          to check eligibility for a return instead.
        </p>

        <p>
          All orders on Bansari Collections are prepaid — we currently accept
          online payment only and do not offer cash on delivery. If an order
          is cancelled successfully before dispatch, the full amount paid
          will be refunded to your original payment method. Refund
          processing by Bansari Collections is generally completed within 7
          days of a confirmed cancellation; the time for the amount to
          reflect in your bank or payment account may vary depending on your
          bank or payment provider.
        </p>

        <p>
          Bansari Collections reserves the right to cancel any order due to
          product unavailability, pricing errors, payment verification
          issues, or suspected fraudulent activity. In such cases, a full
          refund will be processed to the original payment method.
        </p>

        <p>
          Nothing in this policy is intended to limit any rights available to
          customers under applicable law.
        </p>
      </div>
    </main>
  );
}
