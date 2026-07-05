import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    title: "Sarees",
    image: "/categories/sarees.png",
    link: "/shop?category=sarees",
  },
  {
    title: "Kurta Sets",
    image: "/categories/kurta.png",
    link: "/shop?category=kurta-sets",
  },
  {
    title: "Co-ord Sets",
    image: "/categories/coords.png",
    link: "/shop?category=co-ord-sets",
  },
  {
    title: "Anarkali",
    image: "/categories/anarkali.png",
    link: "/shop?category=anarkali",
  },
  {
    title: "Western Wear",
    image: "/categories/western wear.png",
    link: "/shop?category=western-wear",
  },
  {
    title: "Ethnic Glory",
    image: "/categories/Ethnic Glory.png",
    link: "/shop?category=ethnic-glory",
  },
];

export default function CategoryGrid() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-12 text-center text-5xl font-bold">
          Shop By Category
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.link}
              className="group overflow-hidden rounded-3xl shadow transition hover:shadow-xl"
            >
              <Image
                src={category.image}
                alt={category.title}
                width={500}
                height={650}
                className="h-[420px] w-full object-cover"
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