export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Bansari Collections.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

      <div className="space-y-6 text-slate-700 leading-8">
        <p>
          Bansari Collections respects your privacy. We collect only the
          information required to process orders, improve customer experience,
          and provide support.
        </p>

        <p>
          Your personal information is never sold to third parties. Payment
          information is processed securely through trusted payment gateways.
        </p>

        <p>
          By using this website, you agree to the collection and use of
          information in accordance with this Privacy Policy.
        </p>

        <p>
          For any privacy-related questions, contact us at
          <strong> support@bansaricollections.com</strong>.
        </p>
      </div>
    </main>
  );
}
