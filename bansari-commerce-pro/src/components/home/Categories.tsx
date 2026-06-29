const categories = [
  "Sarees",
  "Kurta Sets",
  "Co-ord Sets",
  "Gowns",
  "Lehengas",
  "Dupattas",
];

export default function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="mb-10 text-center text-4xl font-bold">
        Shop By Category
      </h2>

      <div className="grid gap-6 md:grid-cols-3">
        {categories.map((item) => (
          <div
            key={item}
            className="rounded-2xl border p-12 text-center transition hover:shadow-xl"
          >
            <h3 className="text-2xl">{item}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
