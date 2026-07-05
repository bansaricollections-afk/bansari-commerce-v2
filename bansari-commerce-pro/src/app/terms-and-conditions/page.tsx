export const metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for Bansari Collections.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Terms & Conditions</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Welcome to Bansari Collections. By accessing and using this website,
          you agree to comply with these Terms & Conditions.
        </p>

        <p>
          Product availability, pricing, offers and specifications may change
          without prior notice. We reserve the right to refuse or cancel orders
          in cases of pricing errors, suspected fraud or stock unavailability.
        </p>

        <p>
          All website content including images, text, logos and designs is the
          property of Bansari Collections and may not be copied or reproduced
          without written permission.
        </p>

        <p>
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the jurisdiction of the competent courts in Vadodara,
          Gujarat.
        </p>
      </div>
    </main>
  );
}