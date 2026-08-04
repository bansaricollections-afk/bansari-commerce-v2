/**
 * PUT    /api/admin/homepage/[id]  — update campaign
 * DELETE /api/admin/homepage/[id]  — delete campaign
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { updateCampaign, deleteCampaign } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = await req.json();
    const campaign = await updateCampaign(id, payload);
    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
