import BrandStory from "@/components/home/BrandStory";
import CategoryGrid from "@/components/home/CategoryGrid";
import CelebrationEdit from "@/components/home/CelebrationEdit";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Hero from "@/components/home/Hero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import InstagramGallery from "@/components/home/InstagramGallery";
import Newsletter from "@/components/home/Newsletter";
import ShopByOccasion from "@/components/home/ShopByOccasion";
import Testimonials from "@/components/home/Testimonials";
import WhyChooseUs from "@/components/home/WhyChooseUs";

export default function Home() {
  return (
    <main>
      {/* ── Hero ── */}
      <Hero />

      {/* ── Trust Strip ── */}
      <HomeTrustStrip />

      {/* ── Shop by Category ── */}
      <CategoryGrid />

      {/* ── The House Edit (Featured / Best Sellers) ── */}
      <FeaturedProducts />

      {/* ── Shop by Occasion (Wedding Edit) ── */}
      <ShopByOccasion />

      {/* ── Celebration Edit (New Arrivals) ── */}
      <CelebrationEdit />

      {/* ── Why Choose Us ── */}
      <WhyChooseUs />

      {/* ── Luxury Brand Story ── */}
      <BrandStory />

      {/* ── Testimonials (Editor's Picks social proof) ── */}
      <Testimonials />

      {/* ── Instagram Gallery ── */}
      <InstagramGallery />

      {/* ── Newsletter ── */}
      <Newsletter />
    </main>
  );
}
