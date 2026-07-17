import { FaInstagram, FaFacebookF, FaPinterestP } from "react-icons/fa6";

export const metadata = {
  title: "About Us",
  description:
    "Learn about Bansari Collections — a premium ethnic wear boutique based in Vadodara, Gujarat, crafting timeless Indian fashion for weddings, celebrations and every occasion.",
  openGraph: {
    title: "About Bansari Collections",
    description: "Premium ethnic wear boutique based in Vadodara, Gujarat.",
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A5A6A]">
          Our Story
        </p>
        <h1 className="mb-4 font-[family:var(--font-playfair)] text-4xl font-normal text-slate-900">
          About Bansari Collections
        </h1>
      </div>

      <div className="grid gap-10 md:grid-cols-3">
        {/* Story */}
        <div className="md:col-span-2 space-y-6 text-slate-700 leading-8">
          <p>
            Bansari Collections is a premium ethnic fashion boutique dedicated to
            offering thoughtfully curated ethnic wear for every occasion. Our collection
            includes kurta sets, sarees, co-ord sets, gowns and festive wear designed
            with quality, comfort and timeless style in mind.
          </p>

          <p>
            Every product is selected with careful attention to fabric, craftsmanship
            and fit — so our customers receive dependable quality for celebrations,
            office wear and everyday elegance.
          </p>

          <p>
            Based in Vadodara, Gujarat, Bansari Collections serves customers across
            India through a seamless online shopping experience, delivering the warmth
            of a boutique with the convenience of modern commerce.
          </p>

          <div className="pt-2">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Find Us Online
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://instagram.com/bansari_collections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Instagram"
                className="inline-flex items-center gap-2 rounded-full border border-[#ECE7E2] px-4 py-2 text-sm text-slate-700 hover:border-[#8A5A6A] hover:text-[#8A5A6A] transition-colors"
              >
                <FaInstagram size={15} />
                @bansari_collections
              </a>
              <a
                href="https://facebook.com/BansariCollection"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Facebook"
                className="inline-flex items-center gap-2 rounded-full border border-[#ECE7E2] px-4 py-2 text-sm text-slate-700 hover:border-[#8A5A6A] hover:text-[#8A5A6A] transition-colors"
              >
                <FaFacebookF size={14} />
                Bansari Collection
              </a>
              <a
                href="https://pinterest.com/BansariCollections"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bansari Collections on Pinterest"
                className="inline-flex items-center gap-2 rounded-full border border-[#ECE7E2] px-4 py-2 text-sm text-slate-700 hover:border-[#8A5A6A] hover:text-[#8A5A6A] transition-colors"
              >
                <FaPinterestP size={14} />
                Bansari Collections
              </a>
            </div>
          </div>
        </div>

        {/* Contact card */}
        <div>
          <div className="rounded-2xl border border-[#ECE7E2] bg-[#F9F6F3] p-7">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visit Us</p>
            <address className="not-italic space-y-3 text-sm text-slate-700 leading-relaxed">
              <p className="font-medium text-slate-900">Bansari Collections</p>
              <p>
                GF-4, Aruma Park,<br />
                Near Shilchar Company, BIL,<br />
                Vadodara, Gujarat – 391410
              </p>
              <p>
                <a href="tel:+918460192745" className="hover:text-[#8A5A6A] transition-colors">
                  +91 84601 92745
                </a>
              </p>
              <p>
                <a href="mailto:support@bansaricollections.com" className="hover:text-[#8A5A6A] transition-colors break-all">
                  support@bansaricollections.com
                </a>
              </p>
            </address>
          </div>
        </div>
      </div>
    </main>
  );
}
