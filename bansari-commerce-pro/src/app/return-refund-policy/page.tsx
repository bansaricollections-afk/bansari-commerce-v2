export const metadata = {
  title: "Return & Refund Policy | Bansari Collections",
  description:
    "Return and refund policy for Bansari Collections — 7-day return window, 7-day refund processing after approved return and quality check.",
  alternates: {
    canonical: "https://www.bansaricollection.in/return-refund-policy",
  },
};

export default function ReturnRefundPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Return &amp; Refund Policy</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Customer satisfaction is important to us. Most products purchased
          from Bansari Collections can be returned within{" "}
          <strong>7 days of delivery</strong>, subject to the eligibility
          conditions below.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Return eligibility
        </h2>
        <p>
          Products must be unused, unworn, unwashed, and returned with all
          original tags and packaging intact to be eligible for a return.
          Products on sale or at a discounted price are returnable under this
          policy unless the specific product listing is explicitly marked
          &ldquo;Final Sale / Non-Returnable&rdquo;, in which case that product
          is not eligible for return, exchange or refund.
        </p>
        <p>The following are not eligible for return, refund or exchange:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Used or worn garments</li>
          <li>Products with tags removed or missing</li>
          <li>Garments that have been altered</li>
          <li>
            Products explicitly marked &ldquo;Final Sale / Non-Returnable&rdquo;
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Size exchange
        </h2>
        <p>
          If you need a different size, please see our{" "}
          <a href="/exchange-policy" className="underline">
            Exchange Policy
          </a>{" "}
          — size exchanges are available within 4 days of delivery, subject
          to availability.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Defective, damaged or wrong product
        </h2>
        <p>
          If you receive merchandise that is defective, damaged, materially
          different from what was ordered, or the wrong product/size/colour
          due to an error on our part, please contact our support team within
          7 days of delivery with your order number and photographs of the
          product and, where reasonably available, the packaging showing the
          issue. We may ask reasonable follow-up questions or images to
          verify the claim before approving a replacement or refund, but we
          do not require an unboxing video as the only acceptable proof.
        </p>
        <p>
          Where the issue is due to an error by Bansari Collections,{" "}
          <strong>
            we bear the applicable return shipping cost
          </strong>{" "}
          and will arrange or authorise the return. Depending on stock
          availability, we will offer a replacement, an exchange, or a
          refund. We do not promise a replacement where stock of the
          requested product/size is unavailable — a refund will be offered
          instead.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Customer-preference returns (change of mind, size/fit preference)
        </h2>
        <p>
          For returns that are not due to a defect, damage or an error on our
          part (for example, a change of mind or a personal fit preference),
          the customer is responsible for the cost of shipping the product
          back to us, unless otherwise communicated at the time your return
          is approved.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Refund processing
        </h2>
        <p>
          Once your return request is approved, the product is received by
          us, and it passes quality inspection confirming the eligibility
          conditions above are satisfied, the refund will be processed to
          your original payment method (or, where original-method refund is
          not supported, to a bank account you provide) within{" "}
          <strong>7 days</strong> of approval. Refund processing by Bansari
          Collections will generally be completed within 7 days after the
          returned product is received and approved. The time taken for the
          amount to reflect in your bank or payment account may vary
          depending on the payment provider or bank.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          How to initiate a return
        </h2>
        <p>
          Contact our customer support team with your order number before
          sending any product back, so we can guide you through the return
          process.
        </p>

        <p>
          Nothing in this policy is intended to limit any rights available to
          customers under applicable law.
        </p>
      </div>
    </main>
  );
}
