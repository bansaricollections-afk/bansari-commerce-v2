export const metadata = {
  title: "Return & Refund Policy",
  description: "Return and Refund Policy for Bansari Collections.",
};

export default function ReturnRefundPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">
        Return &amp; Refund Policy
      </h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Customer satisfaction is important to us. If you receive a damaged,
          defective or incorrect product, please contact our support team within
          48 hours of delivery.
        </p>

        <p>
          Products must be unused, unwashed, with original tags and packaging
          intact to be eligible for return approval.
        </p>

        <p>
          Once the returned product passes quality inspection, the approved
          refund will be processed to the original payment method or as store
          credit, depending on the order and payment mode.
        </p>

        <p>
          Items damaged due to misuse, alteration, improper handling or normal
          wear and tear are not eligible for return or refund.
        </p>

        <p>
          For any return or refund assistance, contact our customer support
          before sending any product back.
        </p>
      </div>
    </main>
  );
}
