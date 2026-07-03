import { Award, ShieldCheck, Sparkles, Truck } from "lucide-react";
import SectionTitle from "../ui/SectionTitle";

const features = [
  {
    icon: Award,
    title: "Handpicked Designs",
    description:
      "Every collection is carefully curated to reflect timeless elegance and modern Indian fashion.",
  },
  {
    icon: Sparkles,
    title: "Premium Craftsmanship",
    description:
      "Fine fabrics, detailed embroidery and quality finishing create outfits that feel special.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Shopping",
    description:
      "Secure payments, transparent policies and dependable customer support.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description:
      "Reliable shipping with careful packaging to ensure every order arrives beautifully.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">

        <SectionTitle
          eyebrow="Why Choose Us"
          title="The Bansari Experience"
          subtitle="Fashion is more than clothing. It is confidence, celebration and craftsmanship brought together."
        />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-3xl border border-[#F1E9E4] bg-[#FFFDF9] p-8 transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F6F0EB]">
                  <Icon
                    size={30}
                    className="text-[#8A5A6A]"
                  />
                </div>

                <h3 className="text-2xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}