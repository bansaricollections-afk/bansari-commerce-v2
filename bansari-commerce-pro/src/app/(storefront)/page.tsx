import { Suspense } from "react";

import AnnouncementBar from "@/components/home/AnnouncementBar";
import EditorialHero from "@/components/home/EditorialHero";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import TrendingCollections from "@/components/home/TrendingCollections";
import NewArrivals from "@/components/home/NewArrivals";
import BestSellers from "@/components/home/BestSellers";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import OccasionEdit from "@/components/home/OccasionEdit";
import CraftsmanshipStory from "@/components/home/CraftsmanshipStory";
import WhyBansari from "@/components/home/WhyBansari";
import CustomerStories from "@/components/home/CustomerStories";
import LuxuryNewsletter from "@/components/home/LuxuryNewsletter";

export const metadata = {
  title: "Bansari Collection — Luxury Indian Ethnic Fashion",
  description:
    "Discover handcrafted luxury Indian ethnic wear — sarees, lehengas, kurtas and more. Shop the finest artisanal fashion at Bansari Collection.",
};

export default function HomePage() {
  return (
    <>
      {/* ── 1. Announcement Bar ── */}
      <AnnouncementBar />

      {/* ── 2. Header is in layout ── */}

      {/* ── 3. Editorial Hero ── */}
      <EditorialHero />

      {/* ── 4. Shop by Category ── */}
      <Suspense>
        <CategoryShowcase />
      </Suspense>

      {/* ── 5. Trending Collections ── */}
      <TrendingCollections />

      {/* ── 6. New Arrivals ── */}
      <Suspense>
        <NewArrivals />
      </Suspense>

      {/* ── 7. Best Sellers ── */}
      <Suspense>
        <BestSellers />
      </Suspense>

      {/* ── 8. Featured Collections ── */}
      <FeaturedCollections />

      {/* ── 9. Shop by Occasion ── */}
      <OccasionEdit />

      {/* ── 10. Craftsmanship Story ── */}
      <CraftsmanshipStory />

      {/* ── 11. Why Bansari ── */}
      <WhyBansari />

      {/* ── 12. Customer Stories ── */}
      <CustomerStories />

      {/* ── 13. Newsletter ── */}
      <LuxuryNewsletter />
    </>
  );
}
