export const metadata = {
  title: "Collections",
  description:
    "Explore Bansari Collections including Kurta Sets, Sarees, Co-ord Sets and Gowns.",
};

const collections = [
  "Kurta Sets",
  "Sarees",
  "Co-ord Sets",
  "Gowns",
  "Festive Wear",
  "New Arrivals",
];

export default function CollectionsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-4 text-4xl font-bold">Our Collections</h1>

      <p className="mb-10 text-slate-600">
        Discover thoughtfully curated ethnic wear for every occasion.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((item) => (
          <div
            key={item}
            className="rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">{item}</h2>

            <p className="mt-3 text-sm text-slate-600">
              Explore our latest {item.toLowerCase()} collection.
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}