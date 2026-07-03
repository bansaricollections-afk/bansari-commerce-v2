import Image from "next/image";
import Link from "next/link";

const gallery = [
  "/instagram/1.jpg",
  "/instagram/2.jpg",
  "/instagram/3.jpg",
  "/instagram/4.jpg",
  "/instagram/5.jpg",
  "/instagram/6.jpg",
];

export default function InstagramGallery() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14 text-center">

          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Follow Our Journey
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
            Inspired by Every Occasion
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-gray-600">
            Discover styling inspiration, new arrivals and customer moments from Bansari Collections.
          </p>

        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

          {gallery.map((image, index) => (

            <Link
              href="https://instagram.com"
              target="_blank"
              key={index}
              className="group overflow-hidden rounded-3xl"
            >

              <div className="relative aspect-square">

                <Image
                  src={image}
                  alt={`Instagram ${index + 1}`}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-110"
                />

              </div>

            </Link>

          ))}

        </div>

        <div className="mt-14 text-center">

          <a
            href="https://instagram.com"
            target="_blank"
            className="inline-flex rounded-full border border-[#8A5A6A] px-8 py-4 font-semibold text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
          >
            Follow @bansaricollections
          </a>

        </div>

      </div>

    </section>
  );
}