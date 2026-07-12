export const metadata = {
  title: "Shipping Policy",
  description: "Shipping Policy for Bansari Collections.",
};

export default function ShippingPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-bold">Shipping Policy</h1>

      <div className="space-y-6 leading-8 text-slate-700">
        <p>
          Bansari Collections delivers products across India through trusted
          courier partners.
        </p>

        <p>
          Orders are generally processed within 1–2 business days after payment
          confirmation. Delivery timelines may vary depending on the destination
          and courier service availability.
        </p>

        <p>
          Customers will receive shipment tracking details once the order has
          been dispatched.
        </p>

        <p>
          Delays caused by weather conditions, public holidays, courier issues,
          or other unforeseen circumstances are beyond our control.
        </p>
      </div>
    </main>
  );
}
