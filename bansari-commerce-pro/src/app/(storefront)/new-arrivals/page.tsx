export const metadata = {
  title: "New Arrivals",
  description:
    "Discover the latest arrivals from Bansari Collections.",
};

export default function NewArrivalsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-4 text-4xl font-bold">New Arrivals</h1>

      <p className="mb-10 text-slate-600">
        Explore the newest additions to our ethnic wear collection.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-6 flex h-48 items-center justify-center rounded-xl bg-slate-100">
              <span className="text-slate-400">Product Image</span>
            </div>

            <h2 className="text-lg font-semibold">
              New Collection {index + 1}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Premium ethnic wear crafted for every celebration.
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
