import { SHIPPING_THRESHOLD_LABEL } from "@/lib/shipping";

import EditorialHero from "@/components/home/EditorialHero";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import TrendingCollections from "@/components/home/TrendingCollections";
import NewArrivals from "@/components/home/NewArrivals";
import BestSellers from "@/components/home/BestSellers";
import CraftsmanshipStory from "@/components/home/CraftsmanshipStory";
import WhyBansari from "@/components/home/WhyBansari";
import LuxuryNewsletter from "@/components/home/LuxuryNewsletter";

// The homepage renders live catalog data (categories, collections, new
// arrivals, best sellers). Without this it is prerendered once at build time
// and every admin catalog edit stays invisible until the next deploy.
// 60s ISR keeps the page CDN-fast while picking up catalog changes on its own.
export const revalidate = 60;

export const metadata = {
  /*
   * `title.absolute` opts out of the root layout's "%s | Bansari Collections"
   * template. Without it the brand appeared twice in one title, wasting the
   * ~60 characters Google actually renders.
   */
  /*
   * "Vadodara" is in the title because of a measured failure, not a hunch.
   *
   * Search Console, 3 months: "bansari shop" earns 62 impressions at average
   * position 4.9 and ZERO clicks. "bansari" earns 92 impressions, also zero.
   * People looking for a shop called Bansari are seeing this site near the top
   * of page one and choosing something else.
   *
   * That is not a ranking problem — position 4.9 is already good. It is the
   * snippet failing to answer the only question those searchers have: "is this
   * the Bansari I mean?" The old title said what the shop SELLS, which every
   * competing result also says. It did not say WHICH shop this is.
   *
   * Bansari is also a common given name, so a share of those impressions were
   * never going to convert. Naming the city is what separates the two.
   */
  title: {
    absolute: "Bansari Collections — Ethnic Wear Boutique in Vadodara",
  },
  // "handcrafted" dropped: the catalogue is sourced from Jaipur artisans AND
  // from manufacturers, so it was not true of everything sold. This string is
  // what Google prints under the result, which makes it the single most widely
  // read sentence on the site.
  /*
   * Rewritten to lead with WHO and WHERE, then what.
   *
   * Google renders roughly 155 characters, so the first clause is the one that
   * is always read. The previous text opened with "Shop Indian ethnic wear for
   * women" — indistinguishable from every other result on the page. Opening
   * with the shop and the city answers the searcher's actual question in the
   * first six words.
   *
   * Every claim is still checkable: the boutique address is in the footer and
   * the schema, the sourcing line matches /faq, and the shipping threshold is
   * read from the same constant checkout uses rather than typed here.
   */
  description:
    `A women's ethnic wear boutique in Vadodara, Gujarat. Cotton kurta sets, co-ord sets, kurtis and dresses. Free shipping over ₹${SHIPPING_THRESHOLD_LABEL}, free 7-day returns.`,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      {/* Skip to main content — accessible keyboard shortcut */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* The announcement bar lives in the site header. A second copy here
          stacked two bars on the homepage and pushed the hero off a phone. */}

      {/* ── 2. Header is in layout ── */}

      {/* ── 3–13. Homepage sections ── */}
      <main id="main-content" tabIndex={-1}>
        {/* ── 3. Editorial Hero ── */}
        <EditorialHero />

        {/* ── 4. Shop by Category ── */}
        <CategoryShowcase />

        {/* ── 5. Trending Collections ── */}
        <TrendingCollections />

        {/* ── 6. New Arrivals ── */}
        <NewArrivals />

        {/* ── 7. Best Sellers ── */}
        <BestSellers />

        {/* ── 8. Craftsmanship Story ── */}
        <CraftsmanshipStory />

        {/* ── 11. Why Bansari ── */}
        <WhyBansari />

        {/* ── 12. Customer stories removed: no review/testimonial data exists.
               order_items is empty and there is no reviews table, so the
               section could only have shown invented testimonials. It stays
               out until real, attributable customer feedback exists. ── */}

        {/* ── 13. Newsletter ── */}
        <LuxuryNewsletter />
      </main>
    </>
  );
}
