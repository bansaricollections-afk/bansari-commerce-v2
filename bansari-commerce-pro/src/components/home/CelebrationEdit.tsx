import Image from "next/image";
import Link from "next/link";
import SectionTitle from "../ui/SectionTitle";

/* ----------------------------------------------------------------
   Real Unsplash ethnic fashion images — free commercial use.
   Replaces broken /categories/*.jpg local files.
---------------------------------------------------------------- */
const occasions = [
  {
    title: "Wedding Collection",
    href: "/shop?occasion=wedding",
    image:
      "https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?auto=format&fit=crop&w=800&q=85",
    alt: "Bansari Collections — bridal lehenga and wedding ethnic wear",
  },
  {
    title: "Festive Collection",
    href: "/shop?occasion=festive",
    image:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85",
    alt: "Bansari Collections — festive sarees and salwar suits",
  },
  {
    title: "Office Elegance",
    href: "/shop?occasion=office",
    image:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=85",
    alt: "Bansari Collections — elegant office-wear kurta sets",
  },
  {
    title: "Evening Glamour",
    href: "/shop?occasion=evening",
    image:
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=85",
    alt: "Bansari Collections — evening wear anarkali and gowns",
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
              href={item.href}
              className="group overflow-hidden rounded-3xl"
            >
              <div className="relative">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={500}
                  height={700}
                  unoptimized
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
