
import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    title: "Sarees",
    image: "/categories/sarees.png",
    link: "/shop/sarees",
  },
  {
    title: "Kurta Sets",
    image: "/categories/kurta.png",
    link: "/shop/kurta-sets",
  },
  {
    title: "Co-ord Sets",
    image: "/categories/coords.png",
    link: "/shop/co-ord-sets",
  },
  {
    title: "Anarkali",
    image: "/categories/anarkali.png",
    link: "/shop/anarkali",
  },
  {
    title: "western wear",
    image: "/categories/western wear.png",
    link: "/shop/western wear",
  },
  {
    title: "Ethnic Glory",
    image: "/categories/Ethnic Glory.png",
    link: "/shop/Ethnic GLory",
  },
];
export default function CategoryGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-5xl font-bold text-center mb-12">
          Shop By Category
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.link}
              className="group rounded-3xl overflow-hidden shadow hover:shadow-xl transition"
            >
              <Image
                src={category.image}
                alt={category.title}
                width={500}
                height={650}
                className="w-full h-[420px] object-cover"
              />

              <div className="p-5">
                <h3 className="text-2xl font-semibold">
                  {category.title}
                </h3>
              </div>

            </Link>
          ))}

        </div>

      </div>
    </section>
  );
}