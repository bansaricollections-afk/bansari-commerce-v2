export const metadata = {
  title: "Frequently Asked Questions",
  description: "Frequently Asked Questions for Bansari Collections.",
};

const faqs = [
  {
    question: "How can I place an order?",
    answer:
      "Browse products, add your preferred items to the cart and complete checkout using the available payment options.",
  },
  {
    question: "Which payment methods are accepted?",
    answer:
      "We accept secure online payments through Razorpay, including UPI, debit cards, credit cards and net banking.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Most orders are processed within 1\u20132 business days. Delivery timelines vary depending on your location.",
  },
  {
    question: "Can I return a product?",
    answer:
      "Yes. Eligible products can be returned according to our Return & Refund Policy. Products must be unused and returned with original tags.",
  },
  {
    question: "Can I cancel my order?",
    answer:
      "Orders may be cancelled before dispatch. Once shipped, cancellation is no longer possible.",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "You can contact us by phone at +91 84601 92745 or email us at support@bansaricollections.com.",
  },
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">
        Frequently Asked Questions
      </h1>

      <div className="space-y-6">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {faq.question}
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
