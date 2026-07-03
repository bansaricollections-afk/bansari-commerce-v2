import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Shah",
    city: "Vadodara",
    rating: 5,
    review:
      "Beautiful craftsmanship and exactly as shown in the pictures. The fabric quality exceeded my expectations.",
  },
  {
    name: "Neha Patel",
    city: "Ahmedabad",
    rating: 5,
    review:
      "Perfect fitting and elegant embroidery. I received so many compliments during the wedding function.",
  },
  {
    name: "Riya Mehta",
    city: "Surat",
    rating: 5,
    review:
      "Packaging, delivery and product quality were outstanding. Will definitely shop again.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#FAF8F5] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Loved By Customers
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
            Customer Stories
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-gray-600">
            Every order is more than a purchase. It&apos;s part of someone&apos;s
            celebration, festival, or memorable occasion.
          </p>
        </div>

        {/* Rating Summary */}
        <div className="mb-14 flex flex-col items-center justify-center">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={28}
                className="fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>

          <h3 className="mt-3 text-5xl font-bold">4.9 / 5</h3>

          <p className="mt-2 text-gray-500">
            Based on verified customer experiences
          </p>
        </div>

        {/* Reviews */}
        <div className="grid gap-8 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mb-5 flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <p className="leading-8 text-gray-600">
                &ldquo;{item.review}&rdquo;
              </p>

              <div className="mt-8">
                <h4 className="font-semibold">{item.name}</h4>

                <p className="text-sm text-gray-500">{item.city}</p>

                <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Verified Purchase
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}