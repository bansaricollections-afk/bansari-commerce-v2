export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Bansari Collections for product enquiries and customer support.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-4 text-4xl font-bold">Contact Us</h1>

      <p className="mb-10 text-slate-600">
        We’d love to hear from you. Reach out using the details below.
      </p>

      <div className="grid gap-8 rounded-2xl border bg-white p-8 shadow-sm md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900">Store Name</h2>
            <p className="text-slate-600">Bansari Collections</p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Phone</h2>
            <p className="text-slate-600">+91 84601 92745</p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Email</h2>
            <p className="text-slate-600">support@bansaricollections.com</p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Address</h2>
            <p className="text-slate-600">
              GF-4, Aruma Park,
              <br />
              Near Shilchar,
              <br />
              Bil, Vadodara,
              <br />
              Gujarat – 391410
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-100 p-8">
          <h2 className="mb-4 text-xl font-semibold">
            Customer Support
          </h2>

          <p className="leading-7 text-slate-600">
            For product enquiries, order support, sizing assistance or
            wholesale information, please contact us using the phone number or
            email provided. Our team will respond as quickly as possible.
          </p>
        </div>
      </div>
    </main>
  );
}
