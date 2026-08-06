/**
 * Hero.tsx — CMS-driven Campaign Renderer
 *
 * Pure renderer. Zero hardcoded copy, zero hardcoded images,
 * zero hardcoded CTAs — except the production fallback which
 * is shown only when the DB has no published campaigns.
 *
 * Features:
 *   - Crossfade slider (HeroSlider client component)
 *   - LCP optimised: first slide preloaded, rest lazy
 *   - Silent DB error fallback — homepage never crashes
 */
import { getActiveCampaigns } from '@/services/homepage-campaign.service';
import type { HomepageCampaign } from '@/types/homepage-campaign';
import { HeroSlider } from './HeroSlider';

/**
 * Production fallback — shown when DB has zero published campaigns.
 * Uses /images/hero-default.jpg — a high-quality editorial image
 * that must exist in /public/images/hero-default.jpg.
 * Copy is brand-authentic and non-generic.
 */
const FALLBACK: HomepageCampaign = {
  id: 'fallback',
  title: 'Bansari Collections',
  headlineLine1: 'The New Festive Edit',
  headlineHighlight: 'Has Arrived',
  headlineLine2: '',
  description:
    'Handpicked silhouettes for the season — from silk sarees and embroidered lehengas to contemporary kurta sets. Crafted for the modern Indian woman who celebrates with intention.',
  ctaPrimaryText: 'Shop The Edit',
  ctaPrimaryLink: '/shop',
  ctaSecondaryText: 'Explore Collections',
  ctaSecondaryLink: '/collections',
  desktopImage: '/images/hero-default.jpg',
  tabletImage: '/images/hero-default.jpg',
  mobileImage: '/images/hero-default.jpg',
  videoUrl: '',
  imageAlt: 'Bansari Collections — festive editorial, model in embroidered silk lehenga',
  overlayColor: '#1a0a12',
  overlayOpacity: 0.08,
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
