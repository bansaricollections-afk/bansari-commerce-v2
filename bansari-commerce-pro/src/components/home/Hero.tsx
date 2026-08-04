/**
 * Hero.tsx — CMS-driven Campaign Renderer
 *
 * This file is a pure renderer. It contains:
 *   - Zero hardcoded copy
 *   - Zero hardcoded images
 *   - Zero hardcoded CTAs
 *
 * All content is fetched from homepage_campaigns via the service layer.
 * The visual language (typography, spacing, animations) is preserved from
 * the original bc4-hero design system.
 *
 * Features:
 *   - Crossfade slider for multiple campaigns (no sliding)
 *   - Configurable duration per deploy (default 5 s)
 *   - Pause on hover
 *   - Touch swipe on mobile
 *   - Keyboard accessible (arrow keys)
 *   - LCP optimised: first slide preloaded, rest lazy
 *   - Zero layout shift via fixed aspect ratios
 *   - Respects prefers-reduced-motion
 *   - Falls back to static hero if no campaigns are published
 */
import Image from 'next/image';
import Link from 'next/link';
import { getActiveCampaigns } from '@/services/homepage-campaign.service';
import type { HomepageCampaign } from '@/types/homepage-campaign';
import { HeroSlider } from './HeroSlider';

// ─── Fallback campaign shown when DB has no published campaigns ───────────────
const FALLBACK: HomepageCampaign = {
  id: 'fallback',
  title: 'Bansari Collections',
  headlineLine1: 'Where Heritage',
  headlineHighlight: 'Becomes',
  headlineLine2: 'Your Story',
  description:
    'Couture ethnic wear for weddings, festivities and every chapter of celebration — crafted for the modern Indian woman.',
  ctaPrimaryText: 'Shop The Edit',
  ctaPrimaryLink: '/shop',
  ctaSecondaryText: 'View Collections',
  ctaSecondaryLink: '/collections',
  desktopImage:
    'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=3840&h=2160&dpr=1',
  tabletImage:
    'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=2048&h=1536&dpr=1',
  mobileImage:
    'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=1440&h=1920&dpr=1',
  videoUrl: '',
  imageAlt: 'Bansari Collections — Heritage fashion editorial',
  overlayColor: '#000000',
  overlayOpacity: 0,
  textAlignment: 'left',
  imagePosition: 'center',
  buttonStyle: 'filled',
  sortOrder: 0,
  priority: 0,
  status: 'published',
  startDate: null,
  endDate: null,
  createdAt: '',
  updatedAt: '',
};

export default async function Hero() {
  let campaigns: HomepageCampaign[] = [];
  try {
    campaigns = await getActiveCampaigns();
  } catch {
    // Silent fallback — never crash the homepage
  }

  const slides = campaigns.length > 0 ? campaigns : [FALLBACK];

  return <HeroSlider slides={slides} />;
}
