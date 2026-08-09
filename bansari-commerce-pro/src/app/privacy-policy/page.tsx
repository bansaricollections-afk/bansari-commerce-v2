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
            Razorpay order ID and payment ID) — see &ldquo;Payments&rdquo; below
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
          Online payments on our website are processed by Razorpay, a
          third-party payment gateway. When you pay, your card, UPI, or
          banking details are entered directly with Razorpay and are not
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
          <li>Razorpay, to process online payments</li>
          <li>Our courier/logistics partners, to deliver your order</li>
          <li>
            Our website hosting and database service providers, who store
            and process data on our behalf under appropriate confidentiality
            obligations
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Cookies and tracking
        </h2>
        <p>
          Our website may use essential cookies/local storage required for
          core functionality such as keeping items in your cart and keeping
          you signed in. We do not currently use third-party advertising or
          analytics tracking cookies on this website.
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
          <a href="mailto:support@bansaricollections.com" className="underline">
            support@bansaricollections.com
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
