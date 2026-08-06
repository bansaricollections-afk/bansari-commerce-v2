import { Suspense } from 'react';

import BrandStory from '@/components/home/BrandStory';
import CampaignBanner from '@/components/home/CampaignBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import FeaturedProducts, {
  FeaturedProductsSkeleton,
} from '@/components/home/FeaturedProducts';
import Hero from '@/components/home/Hero';
import HomeTrustStrip from '@/components/home/HomeTrustStrip';
import Newsletter from '@/components/home/Newsletter';
import ShopByOccasion from '@/components/home/ShopByOccasion';
import Testimonials from '@/components/home/Testimonials';
import WhyChooseUs from '@/components/home/WhyChooseUs';

export default function Home() {
  return (
    <main>
      {/* ─── Above the fold ─── */}
      <Hero />
      <CampaignBanner />
      <HomeTrustStrip />

      {/* ─── Discovery ─── */}
      <CategoryGrid />

      {/* ─── Merchandising ─── */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>

      {/* ─── Occasion navigation ─── */}
      <ShopByOccasion />

      {/* ─── Trust & brand ─── */}
      <WhyChooseUs />
      <BrandStory />

      {/* ─── Social proof ─── */}
      <Testimonials />

      {/* ─── Retention ─── */}
      <Newsletter />
    </main>
  );
}
