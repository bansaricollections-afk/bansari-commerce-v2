/**
 * POST /api/admin/homepage/[id]/duplicate
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { duplicateCampaign } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdminSession(_req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const campaign = await duplicateCampaign(id);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
