/**
 * Admin → Homepage — Server Component
 * Fetches campaign list server-side, passes to client manager.
 */
import type { Metadata } from 'next';
import type { HomepageCampaign } from '@/types/homepage-campaign';
import { listAllCampaigns } from '@/services/homepage-campaign.service';
import { HomepageCampaignManager } from '@/components/admin/homepage/HomepageCampaignManager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Homepage Campaigns | Admin',
};

export default async function HomepageAdminPage() {
  let initial: HomepageCampaign[] = [];
  try {
    initial = await listAllCampaigns();
  } catch {
    // Table may not exist yet — show empty state
  }

  return <HomepageCampaignManager initial={initial} />;
}
