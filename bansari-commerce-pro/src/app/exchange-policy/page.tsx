export const metadata = {
  title: "Exchange Policy",
  description:
    "Size and exchange policy for Bansari Collections — exchange requests within 4 days of delivery, subject to eligibility conditions.",
  alternates: {
    canonical: "https://www.bansaricollection.in/exchange-policy",
  },
};

export default function ExchangePolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Exchange Policy</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Bansari Collections offers a size exchange window of{" "}
          <strong>4 days from the date of delivery</strong>. If the size you
          received does not fit, you may request a size exchange within this
          period, subject to availability of the requested size.
        </p>

        <p>
          Product exchanges (for reasons other than size) are also available
          within <strong>4 days of delivery</strong>, subject to the same
          eligibility conditions described below and stock availability of
          the requested product.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Eligibility for exchange
        </h2>
        <p>
          To be eligible for exchange, the product must be unused, unworn,
          unwashed, and returned with all original tags and packaging intact.
          The following are not eligible for exchange:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Used or worn garments</li>
          <li>Products with tags removed or missing</li>
          <li>Garments that have been altered</li>
          <li>
            Products explicitly marked &ldquo;Final Sale / Non-Returnable&rdquo;
            at the time of purchase
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          If the requested size/product is unavailable
        </h2>
        <p>
          If the requested exchange size or product is out of stock, we will
          offer a refund in accordance with our{" "}
          <a href="/return-refund-policy" className="underline">
            Return &amp; Refund Policy
          </a>{" "}
          instead. We do not promise a replacement where stock is
          unavailable.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Wrong, defective or damaged items
        </h2>
        <p>
          If the size/product issue is the result of an error by Bansari
          Collections (wrong item dispatched, defective or damaged product),
          please refer to the &ldquo;Defective, Damaged or Wrong Product&rdquo;
          section of our{" "}
          <a href="/return-refund-policy" className="underline">
            Return &amp; Refund Policy
          </a>{" "}
          — in these cases Bansari Collections bears the applicable return
          shipping cost.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          How to request an exchange
        </h2>
        <p>
          Contact our customer support team within 4 days of delivery with
          your order number and details of the exchange request before
          sending any product back.
        </p>

        <p>
          Nothing in this policy is intended to limit any rights available to
          customers under applicable law.
        </p>
      </div>
    </main>
  );
}
