const PILLARS = [
  {
    label: "Designed in India",
    body: "Every silhouette is conceived by our in-house studio in Surat, drawing from centuries of craft tradition.",
    symbol: "✦",
  },
  {
    label: "Premium Fabrics",
    body: "We source only the finest Chanderi silks, Georgette, and handloom Cotton from master weavers across India.",
    symbol: "◈",
  },
  {
    label: "Handcrafted Details",
    body: "From mirror-work to chikankari, every embroidery is stitched by artisan hands — never by machine.",
    symbol: "◉",
  },
];

export default function ShopEditorialBreak() {
  return (
    <section
      aria-label="Our craft"
      className="my-16 border-y border-slate-100 bg-[#F9F6F2] py-14"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">

        {/* Eyebrow */}
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px w-12 bg-slate-200" />
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#8A5A6A]">Our Craft</span>
            <div className="h-px w-12 bg-slate-200" />
          </div>
          <h2 className="font-[family:var(--font-playfair)] text-[clamp(1.3rem,3vw,2rem)] font-normal text-slate-900">
            Luxury You Can Feel
          </h2>
          <p className="max-w-sm text-[12px] leading-relaxed text-slate-400">
            Made for celebrations. Made to last. Made with love.
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PILLARS.map((p, i) => (
            <div
              key={p.label}
              className={[
                "flex flex-col items-center gap-4 text-center",
                i !== PILLARS.length - 1 ? "sm:border-r sm:border-slate-100" : "",
              ].join(" ")}
            >
              <span
                className="font-[family:var(--font-playfair)] text-2xl text-[#8A5A6A]"
                aria-hidden="true"
              >
                {p.symbol}
              </span>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900">
                {p.label}
              </h3>
              <p className="max-w-[22ch] text-[12px] leading-relaxed text-slate-500">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}