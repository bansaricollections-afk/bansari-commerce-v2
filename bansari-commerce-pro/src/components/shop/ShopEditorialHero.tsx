/*
 * Shop hero.
 *
 * This is a LISTING page, not the homepage. Measured before this pass, the
 * first product sat 951px down on desktop and 1110px on mobile — 1.3 screens
 * of scroll before a visitor who clicked SHOP saw a single garment. The hero
 * alone was 385px of that.
 *
 * Trimmed to a kicker, the headline and the collection chips. Removed:
 *   • The subline ("Every piece we currently stock… Filter by category…") —
 *     instructions for a filter panel that is self-evident.
 *   • The "View All" button — it linked to /shop, which is the page you are
 *     already on, showing all products.
 *   • The "New Arrivals" button — duplicated the New Arrivals chip directly
 *     beneath it.
 *
 * Collections are now derived from the live catalogue rather than a hardcoded
 * list. The previous constant was a stale snapshot; the design system requires
 * taxonomy to come from the catalog so chips cannot rot into dead links.
 */
import { getShopFacets } from "@/services/shop-facets";
import OccasionTiles from "./OccasionTiles";

/** Chips are a glance, not a directory — cap so the hero cannot grow tall again. */
const MAX_CHIPS = 4;

export default async function ShopEditorialHero() {
  const facets = await getShopFacets();
  const collections = facets.collections.slice(0, MAX_CHIPS);

  return (
    <section
      aria-label="Seasonal campaign"
      className="relative overflow-hidden bg-[#F5F0EC]"
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

      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center px-5 py-5 text-center md:px-10 lg:px-16 lg:py-9">

        {/* Kicker */}
        <p className="mb-2.5 hidden text-[9px] sm:block font-bold uppercase tracking-[0.32em] text-[#8A5A6A]">
          ✦ The Bansari Catalogue ✦
        </p>

        {/* Editorial headline */}
        <h2 className="font-[family:var(--font-playfair)] text-[1.25rem] sm:text-[clamp(1.4rem,3.6vw,2.4rem)] font-normal leading-[1.1] text-slate-900">
          Dressed for Every Story
        </h2>

        {/* Occasion first — how this category is actually shopped. */}
        <OccasionTiles className="mt-4 w-full max-w-4xl text-left" />

        {/* Collection chips — desktop only now; the header menu lists them on
            phones, and here they pushed the first product down. */}
        <div className="mt-5 hidden flex-wrap items-center justify-center gap-2 sm:flex">
          {collections.map((tag) => (
            <a
              key={tag}
              href={`/shop?collection=${encodeURIComponent(tag)}`}
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