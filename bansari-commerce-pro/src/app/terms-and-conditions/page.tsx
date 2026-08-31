export const metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and Conditions governing use of www.bansaricollection.in and purchases from Bansari Collections — orders, pricing, delivery, cancellations and liability.",
  alternates: {
    canonical: "https://www.bansaricollection.in/terms-and-conditions",
  },
};

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Terms &amp; Conditions</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Welcome to www.bansaricollection.in (&ldquo;the website&rdquo;), owned
          and operated by Bansari Collections, a sole proprietorship business
          run by Mosmiben Devangkumar Bhatt, based in Vadodara, Gujarat,
          India. By accessing or using this website, you agree to comply
          with these Terms &amp; Conditions.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">Website use</h2>
        <p>
          You agree to use this website only for lawful purposes and in a
          manner that does not infringe the rights of, or restrict or
          inhibit the use and enjoyment of this website by, any third party.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Product information &amp; pricing
        </h2>
        <p>
          We make every effort to display product details, images, sizing
          and pricing accurately. Product availability, pricing, offers and
          specifications may change without prior notice. Listed prices are
          in Indian Rupees (₹) and are inclusive of applicable taxes unless
          stated otherwise on the product page. We reserve the right to
          refuse or cancel an order in cases of pricing errors, suspected
          fraud, or stock unavailability, in which case a full refund will
          be issued for any payment already made.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Order placement &amp; acceptance
        </h2>
        <p>
          Placing an order on the website is an offer to purchase, which we
          may accept or decline. An order is confirmed only once payment has
          been successfully authorised and you have received an order
          confirmation.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">Payment</h2>
        <p>
          All orders on this website are prepaid. Payments are processed
          securely through a PCI-DSS compliant third-party payment gateway;
          we do not store your card, UPI or
          banking credentials. See our{" "}
          <a href="/privacy-policy" className="underline">Privacy Policy</a>{" "}
          for details on how payment-related information is handled. We do
          not currently offer cash on delivery.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Cancellation, shipping, returns, exchanges &amp; refunds
        </h2>
        <p>
          Order cancellation, shipping, returns, exchanges and refunds are
          governed by our{" "}
          <a href="/cancellation-policy" className="underline">Cancellation Policy</a>,{" "}
          <a href="/shipping-policy" className="underline">Shipping Policy</a>,{" "}
          <a href="/return-refund-policy" className="underline">Return &amp; Refund Policy</a>{" "}
          and{" "}
          <a href="/exchange-policy" className="underline">Exchange Policy</a>,
          each of which forms part of these Terms.
        </p>
        <p>
          In summary: returns are accepted within 7 days of delivery and
          exchanges (including size exchanges) within 4 days of delivery,
          subject to eligibility conditions set out in those policies. Where
          a defective, damaged, or wrong product is dispatched due to our
          error, we bear the applicable return shipping cost.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Intellectual property
        </h2>
        <p>
          All website content, including images, text, logos and designs, is
          the property of Bansari Collections and may not be copied,
          reproduced or used without written permission.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Prohibited use
        </h2>
        <p>
          You must not misuse this website by knowingly introducing viruses
          or other malicious material, attempting unauthorised access to our
          systems, or using the website for any fraudulent or unlawful
          purpose.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Limitation of liability
        </h2>
        <p>
          To the extent permitted by applicable law, Bansari Collections
          shall not be liable for any indirect, incidental or consequential
          loss arising from the use of this website or the products
          purchased through it, beyond the value of the relevant order.
          Nothing in these Terms is intended to limit any rights available
          to customers under applicable law, including the Consumer
          Protection Act, 2019, and the rules made thereunder.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Changes to these Terms
        </h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          website after changes are posted constitutes acceptance of the
          updated Terms.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Governing law &amp; jurisdiction
        </h2>
        <p>
          These Terms are governed by the laws of India. Any disputes shall
          be subject to the jurisdiction of the competent courts in
          Vadodara, Gujarat.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Business &amp; grievance information
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Legal entity: Sole Proprietorship</li>
          <li>Proprietor: Mosmiben Devangkumar Bhatt</li>
          <li>GSTIN: 24CTLPS4594R1ZH</li>
          <li>Udyam Registration: UDYAM-GJ-24-0234126</li>
          <li>
            Registered address: Ground Floor, Flat No. 4, Auroma Park, Bill
            Road, Bill, Vadodara, Gujarat 391410, India (the same location
            shown on our Contact page and website footer)
          </li>
          <li>
            Customer support:{" "}
            <a href="mailto:support@bansaricollection.in" className="underline">
              support@bansaricollection.in
            </a>{" "}
            /{" "}
            <a href="tel:+918460192745" className="underline">
              +91 84601 92745
            </a>
          </li>
          <li>
            Grievance Officer: [GRIEVANCE OFFICER NAME &amp; DEDICATED CONTACT
            — BUSINESS CONFIRMATION REQUIRED]. Until a dedicated grievance
            officer is designated, grievances may be raised through the
            customer support contact above.
          </li>
        </ul>
      </div>
    </main>
  );
}
