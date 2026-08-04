/**
 * GET  /api/admin/homepage  — list all campaigns
 * POST /api/admin/homepage  — create a campaign
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { listAllCampaigns, createCampaign } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const campaigns = await listAllCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    if (err instanceof CampaignError && err.code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const payload = await req.json();
    if (!payload?.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const campaign = await createCampaign(payload);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    const status = err instanceof CampaignError && err.code === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
