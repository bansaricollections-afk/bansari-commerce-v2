export const metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers to common questions about ordering, payments, delivery, returns and customer support at Bansari Collections.',
  alternates: {
    canonical: 'https://www.bansaricollection.in/faq',
  },
};

const faqs = [
  {
    question: 'How can I place an order?',
    answer:
      'Browse products, add your preferred items to the cart and complete checkout using the available payment options.',
  },
  {
    question: 'Which payment methods are accepted?',
    answer:
      'We accept secure online payments through our payment gateway, including UPI, debit cards, credit cards and net banking.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Most orders are processed within 1–2 business days. Delivery timelines vary depending on your location.',
  },
  {
    question: 'Can I return a product?',
    answer:
      'Yes. Eligible products can be returned within 7 days of delivery according to our Return & Refund Policy. Products must be unused, unwashed, and returned with original tags and packaging intact. Products explicitly marked "Final Sale / Non-Returnable" are not eligible.',
  },
  {
    question: 'Can I exchange a product for a different size?',
    answer:
      'Yes. Size exchanges are available within 4 days of delivery, subject to availability of the requested size — see our Exchange Policy for details.',
  },
  {
    question: 'What if I receive a defective, damaged or wrong product?',
    answer:
      'Contact our support team within 7 days of delivery with your order number and photos of the issue. If the error is on our part, we bear the applicable return shipping cost and will offer a replacement, exchange, or refund depending on stock availability.',
  },
  {
    question: 'Can I cancel my order?',
    answer:
      'Orders may be cancelled free of charge before dispatch. Once shipped, cancellation is no longer possible and our Return & Refund Policy applies instead.',
  },
  {
    question: 'Do you offer cash on delivery (COD)?',
    answer:
      'No. All orders on Bansari Collections are prepaid — we accept secure online payment only.',
  },
  {
    question: 'How do I contact customer support?',
    answer:
      'You can contact us by phone at +91 84601 92745 or email us at support@bansaricollection.in.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <h1 className="mb-8 text-4xl font-bold">Frequently Asked Questions</h1>

      <div className="space-y-6">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{faq.question}</h2>
            <p className="mt-3 leading-7 text-slate-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
