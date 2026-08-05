/**
 * Hero.tsx — CMS-driven Campaign Renderer
 *
 * Pure renderer. Zero hardcoded copy, images, or CTAs.
 * All content sourced from homepage_campaigns via the service layer.
 *
 * Fallback strategy:
 *   - No published campaigns → FALLBACK campaign with local /hero-emergency.jpg
 *   - NEVER uses Pexels, Unsplash, or any external stock URL
 */
import { getActiveCampaigns } from '@/services/homepage-campaign.service';
import type { HomepageCampaign } from '@/types/homepage-campaign';
import { HeroSlider } from './HeroSlider';

// ─── Local emergency fallback — no external dependencies ─────────────────────
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
  desktopImage: '/hero-emergency.jpg',
  tabletImage: '/hero-emergency.jpg',
  mobileImage: '/hero-emergency.jpg',
  videoUrl: '',
  imageAlt: 'Bansari Collections — Heritage fashion editorial',
  overlayColor: '#000000',
  overlayOpacity: 0.35,
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

  if (campaigns.length === 0) {
    console.warn('[Homepage] No published campaign found. Using emergency hero.');
  }

  const slides = campaigns.length > 0 ? campaigns : [FALLBACK];

  return <HeroSlider slides={slides} />;
}
