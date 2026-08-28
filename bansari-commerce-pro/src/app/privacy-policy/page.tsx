export const metadata = {
  title: "Privacy Policy | Bansari Collections",
  description:
    "Privacy Policy for Bansari Collections — what information we collect, how it is used, and how it is protected.",
  alternates: {
    canonical: "https://www.bansaricollection.in/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

      <div className="space-y-6 text-slate-700 leading-8">
        <p>
          Bansari Collections (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
          privacy. This policy explains what information we collect when you
          use www.bansaricollection.in, how it is used, and who it may be
          shared with.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Information we collect
        </h2>
        <p>When you browse our website, create an account, or place an order, we may collect:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Your name, email address and phone number</li>
          <li>Shipping and billing address</li>
          <li>Account/login information, if you create an account</li>
          <li>
            Order details — products purchased, quantities, prices, and order
            status
          </li>
          <li>
            Payment identifiers relating to a transaction (such as a
            payment gateway order ID and payment ID) — see &ldquo;Payments&rdquo; below
          </li>
          <li>Items you add to your cart or wishlist</li>
          <li>
            Messages you send us, for example via WhatsApp, email, or our
            contact form
          </li>
        </ul>
        <p>
          We only collect the information reasonably required to process
          your order, operate your account, and provide customer support.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Payments
        </h2>
        <p>
          Online payments on our website are processed by a PCI-DSS compliant
          third-party payment gateway. When you pay, your card, UPI, or
          banking details are entered directly with the gateway and are not
          stored on our servers — we receive and store only payment status
          and transaction reference identifiers (such as order ID, payment
          ID, and payment status) needed to confirm and record your order.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          How we use your information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Process and fulfil your orders, including shipping and delivery</li>
          <li>Communicate with you about your order, account, or support requests</li>
          <li>Verify payments and prevent fraud</li>
          <li>Improve our website and customer experience</li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Sharing of information
        </h2>
        <p>
          We do not sell your personal information to third parties. We
          share information only where necessary to operate our business,
          including with:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Our payment gateway provider, to process online payments</li>
          <li>Our courier/logistics partners, to deliver your order</li>
          <li>
            Our website hosting and database service providers, who store
            and process data on our behalf under appropriate confidentiality
            obligations
          </li>
          <li>
            Google and Meta, for the analytics and advertising measurement
            described under &ldquo;Cookies and tracking&rdquo; below — and
            only where you have not declined
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Cookies and tracking
        </h2>
        <p>
          We use two kinds of cookies and similar storage.
        </p>
        <p>
          <strong>Essential</strong> — required for the site to work at all:
          keeping items in your cart and keeping you signed in. These cannot
          be switched off, and we do not use them to track you across other
          websites.
        </p>
        <p>
          <strong>Analytics and advertising</strong> — used to understand how
          our collections are found and which of our advertisements led you
          here. These are provided by Google (Google Analytics and Google
          Ads) and Meta (the Facebook/Instagram pixel), and we also store a
          first-party cookie recording the campaign or link you arrived from
          so that an order can be attributed to it.
        </p>
        <p>
          When you place an order, we also send a record of that purchase
          directly from our servers to Meta so the sale can be matched to any
          advertisement you saw. Where that record includes your email
          address or phone number, it is converted into an irreversible
          cryptographic hash before it leaves our systems — Meta receives the
          hash, never the address or number itself.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Your cookie choices
        </h2>
        <p>
          When you first visit, we show a notice explaining this and offering
          a choice. If you decline, we stop writing the attribution cookie,
          withdraw consent from the Google and Meta tags, and the purchase
          record described above is sent without your email address, phone
          number, name, address or any other identifier — leaving only the
          order value and currency, which we use for our own sales reporting.
        </p>
        <p>
          Visitors in the United Kingdom and the European Economic Area are
          treated differently by default: nothing analytics- or
          advertising-related is loaded until consent is given.
        </p>
        <p>
          You can change your decision at any time using the{" "}
          <strong>Cookie preferences</strong> link at the bottom of any page.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Your rights
        </h2>
        <p>
          You may contact us to request access to, correction of, or
          deletion of your personal information, subject to our legitimate
          business and legal requirements (for example, retaining order
          records as required by law). To make a request, contact us using
          the details below.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Contact us
        </h2>
        <p>
          For any privacy-related questions or requests, contact us at{" "}
          <a href="mailto:support@bansaricollection.in" className="underline">
            support@bansaricollection.in
          </a>{" "}
          or call{" "}
          <a href="tel:+918460192745" className="underline">
            +91 84601 92745
          </a>
          .
        </p>

        <p>
          By using this website, you agree to the collection and use of
          information in accordance with this Privacy Policy. We may update
          this policy from time to time; material changes will be reflected
          on this page.
        </p>
      </div>
    </main>
  );
}
