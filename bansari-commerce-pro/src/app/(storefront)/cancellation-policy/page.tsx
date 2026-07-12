export const metadata = {
  title: "Cancellation Policy",
  description: "Order Cancellation Policy for Bansari Collections.",
};

export default function CancellationPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">
        Cancellation Policy
      </h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Orders can be cancelled before they are packed or dispatched from our
          warehouse.
        </p>

        <p>
          Once an order has been shipped, cancellation requests cannot be
          accepted. Customers may refer to our Return &amp; Refund Policy if
          eligible.
        </p>

        <p>
          If an order is cancelled successfully before dispatch, the full amount
          paid will be refunded to the original payment method within the
          applicable banking timelines.
        </p>

        <p>
          Bansari Collections reserves the right to cancel any order due to
          product unavailability, pricing errors, payment verification issues or
          suspected fraudulent activity. In such cases, a full refund will be
          processed.
        </p>

        <p>
          For cancellation assistance, please contact our customer support as
          soon as possible after placing your order.
        </p>
      </div>
    </main>
  );
}
