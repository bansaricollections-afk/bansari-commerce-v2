import { Suspense } from 'react';

import BrandStory from '@/components/home/BrandStory';
import CampaignBanner from '@/components/home/CampaignBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import { FeaturedProductsSkeleton } from '@/components/home/FeaturedProducts';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Hero from '@/components/home/Hero';
import HomeTrustStrip from '@/components/home/HomeTrustStrip';
import Newsletter from '@/components/home/Newsletter';
import ShopByOccasion from '@/components/home/ShopByOccasion';
import Testimonials from '@/components/home/Testimonials';
import WhyChooseUs from '@/components/home/WhyChooseUs';

/**
 * Bansari Commerce — Homepage
 *
 * Performance contract:
 *  - Hero is above-fold: renders synchronously, no Suspense
 *  - FeaturedProducts is async (DB fetch) → Suspense boundary
 *  - All sections below the fold defer paint via content-visibility: auto in globals.css
 *  - No client JS on this file (Server Component)
 */
export default function Home() {
  return (
    <main>
      {/* ── 1. Hero — LCP element, above fold, synchronous ── */}
      <Hero />

      {/* ── 2. Campaign Banner ── */}
      <CampaignBanner />

      {/* ── 3. Trust Signals ── */}
      <HomeTrustStrip />

      {/* ── 4. Shop by Category ── */}
      <CategoryGrid />

      {/* ── 5. The House Edit — async DB fetch, streamed ── */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>

      {/* ── 6. Shop by Occasion (Wedding / Festive Edits) ── */}
      <ShopByOccasion />

      {/* ── 7. Brand Pillars ── */}
      <WhyChooseUs />

      {/* ── 8. Brand Story — editorial long copy ── */}
      <BrandStory />

      {/* ── 9. Social Proof ── */}
      <Testimonials />

      {/* ── 10. Newsletter ── */}
      <Newsletter />
    </main>
  );
}
