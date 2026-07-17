export default function ShopEditorialHero() {
  return (
    <section
      aria-label="Seasonal campaign"
      className="relative overflow-hidden bg-[#F5F0EC]"
      style={{ minHeight: "clamp(180px, 28vw, 340px)" }}
    >
      {/* Decorative rule lines — desktop */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-5 opacity-20 md:px-10 lg:px-16"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-px bg-slate-400"
            style={{ height: `${24 + Math.sin(i * 0.8) * 40}px` }}
          />
        ))}
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center px-5 py-12 text-center md:px-10 lg:px-16 lg:py-16">

        {/* Kicker */}
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.32em] text-[#8A5A6A]">
          ✦ Festive 2025 Edit ✦
        </p>

        {/* Editorial headline */}
        <h2 className="font-[family:var(--font-playfair)] text-[clamp(1.5rem,5vw,3.5rem)] font-normal leading-[1.1] text-slate-900">
          Dressed for Every Story
        </h2>

        {/* Subline */}
        <p className="mx-auto mt-4 max-w-lg text-[12px] leading-relaxed text-slate-500 md:text-[13px]">
          From heirloom silks to festival-ready kurtas — a curated wardrobe
          for the woman who celebrates every moment.
        </p>

        {/* CTA row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/shop?category=festive-wear"
            className="inline-flex items-center gap-2 bg-slate-900 px-7 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:bg-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          >
            Shop Festive Edit
          </a>
          <a
            href="/shop?category=new-arrivals"
            className="inline-flex items-center gap-2 border border-slate-300 bg-transparent px-7 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-all duration-200 hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
          >
            New Arrivals
          </a>
        </div>

        {/* Collection chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {[
            "Wedding Edit",
            "Office Collection",
            "Celebrity Inspired",
            "Summer Collection",
            "Editor's Picks",
          ].map((tag) => (
            <a
              key={tag}
              href={`/shop?edit=${tag.toLowerCase().replace(/\s+/g, "-")}`}
              className="border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-all duration-200 hover:border-[#8A5A6A] hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
            >
              {tag}
            </a>
          ))}
        </div>
      </div>

      {/* Bottom rule */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </section>
  );
}