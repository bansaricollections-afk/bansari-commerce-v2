import AnnouncementBar from "@/components/home/AnnouncementBar";
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
  title: "Bansari Collection — Luxury Indian Ethnic Fashion",
  description:
    "Discover handcrafted luxury Indian ethnic wear — sarees, lehengas, kurtas and more. Shop the finest artisanal fashion at Bansari Collection.",
};

export default function HomePage() {
  return (
    <>
      {/* Skip to main content — accessible keyboard shortcut */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* ── 1. Announcement Bar (outside <main> — correct landmark) ── */}
      <AnnouncementBar />

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
