import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Kurta Sets",
    image: "/categories/kurta.jpg",
    href: "/shop?category=kurta-sets",
  },
  {
    name: "Ethnic Dresses",
    image: "/categories/dress.jpg",
    href: "/shop?category=ethnic-dresses",
  },
  {
    name: "Sarees",
    image: "/categories/saree.jpg",
    href: "/shop?category=sarees",
  },
  {
    name: "Lehengas",
    image: "/categories/lehenga.jpg",
    href: "/shop?category=lehengas",
  },
  {
    name: "Co-ord Sets",
    image: "/categories/coord.jpg",
    href: "/shop?category=coord-sets",
  },
  {
    name: "Gowns",
    image: "/categories/gown.jpg",
    href: "/shop?category=gowns",
  },
];

export default function ShopByCategory() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14 text-center">

          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Shop by Category
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
            Find Your Perfect Style
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-gray-600">
            Explore curated collections designed for every celebration,
            occasion and everyday elegance.
          </p>

        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

          {categories.map((category) => (

            <Link
              key={category.name}
              href={category.href}
              className="group overflow-hidden rounded-[32px]"
            >

              <div className="relative h-[450px]">

                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <div className="absolute bottom-8 left-8">

                  <h3 className="font-[family:var(--font-playfair)] text-3xl font-bold text-white">
                    {category.name}
                  </h3>

                  <span className="mt-2 inline-block text-white/90">
                    Explore →
                  </span>

                </div>

              </div>

            </Link>

          ))}

        </div>

      </div>

    </section>
  );
}
