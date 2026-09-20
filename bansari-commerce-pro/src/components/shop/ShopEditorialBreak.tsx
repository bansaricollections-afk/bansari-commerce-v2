/*
 * TRUTH PASS — all three pillars previously described a business this is not.
 *
 * Bansari SOURCES. It does not design in-house, it does not weave, and it does
 * not manufacture. Stock comes from artisan clusters in Jaipur and from
 * established manufacturers, and is selected in Vadodara. The three claims
 * replaced here were:
 *
 *   "Every silhouette is conceived by our in-house studio in Vadodara"
 *      — there is no design studio.
 *   "We source only the finest ... from master weavers across India"
 *      — "only the finest" and "master weavers" are unverifiable, and the
 *        hard-coded fabric list does not track the catalogue.
 *   "every embroidery is stitched by artisan hands — never by machine"
 *      — the strongest of the three, and disprovable by looking at a garment.
 *
 * What replaces them is narrower, duller and checkable. That is the point: a
 * claim a customer can verify is worth more than one they must take on faith,
 * and this shop's actual advantage — a small catalogue chosen by a person who
 * has handled every piece — is real and was being buried under invented craft
 * language.
 */
const PILLARS = [
  {
    label: "Chosen in Vadodara",
    body: "Every piece is selected by hand at our boutique in Vadodara. We buy in small numbers, most in a single unit per size.",
    symbol: "✦",
  },
  {
    label: "Sourced from Jaipur",
    body: "Much of the block-printing and embroidery we carry comes from artisan clusters in Jaipur, alongside manufacturers we buy from directly.",
    symbol: "◈",
  },
  {
    label: "Stated Openly",
    body: "Fabric, work and fit are published on every product page, taken from the same record we buy against.",
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