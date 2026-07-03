import Image from "next/image";
import Link from "next/link";

const occasions = [
  {
    title: "Wedding",
    subtitle: "Celebrate every special moment",
    image: "/occasions/wedding.jpg",
    href: "/shop?occasion=wedding",
  },
  {
    title: "Festive",
    subtitle: "Traditional elegance",
    image: "/occasions/festive.jpg",
    href: "/shop?occasion=festive",
  },
  {
    title: "Office",
    subtitle: "Elegant workwear",
    image: "/occasions/office.jpg",
    href: "/shop?occasion=office",
  },
  {
    title: "Party",
    subtitle: "Make every entrance memorable",
    image: "/occasions/party.jpg",
    href: "/shop?occasion=party",
  },
];

export default function ShopByOccasion() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="uppercase tracking-[5px] text-[#8A5A6A]">
            Shop By Occasion
          </p>

          <h2 className="mt-3 font-[family:var(--font-playfair)] text-5xl font-bold">
            Dress For Every Celebration
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-gray-600">
            Whether it&apos;s a wedding, festival, office gathering or evening
            event, discover styles thoughtfully curated for every occasion.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {occasions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group overflow-hidden rounded-[32px]"
            >
              <div className="relative h-[420px]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute bottom-8 left-8">
                  <h3 className="font-[family:var(--font-playfair)] text-3xl font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm text-white/90">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}