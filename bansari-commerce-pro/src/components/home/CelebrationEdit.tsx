import Image from "next/image";
import Link from "next/link";
import SectionTitle from "../ui/SectionTitle";

const occasions = [
  {
    title: "Wedding Collection",
    image: "/categories/wedding.jpg",
  },
  {
    title: "Festive Collection",
    image: "/categories/festive.jpg",
  },
  {
    title: "Office Elegance",
    image: "/categories/office.jpg",
  },
  {
    title: "Evening Glamour",
    image: "/categories/evening.jpg",
  },
];

export default function CelebrationEdit() {
  return (
    <section className="bg-[#FFFDF9] py-24">
      <div className="mx-auto max-w-7xl px-6">

        <SectionTitle
          eyebrow="Curated For Every Occasion"
          title="The Celebration Edit"
          subtitle="Thoughtfully curated collections designed for every memorable moment."
        />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {occasions.map((item) => (
            <Link
              key={item.title}
              href="/shop"
              className="group overflow-hidden rounded-3xl"
            >
              <div className="relative">

                <Image
                  src={item.image}
                  alt={item.title}
                  width={500}
                  height={700}
                  className="h-[420px] w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                <div className="absolute bottom-8 left-8">

                  <h3 className="text-2xl font-semibold text-white">
                    {item.title}
                  </h3>

                </div>

              </div>

            </Link>
          ))}

        </div>

      </div>
    </section>
  );
}