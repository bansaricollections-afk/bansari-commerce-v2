/**
 * PATCH /api/admin/homepage/reorder
 * Body: { items: { id: string; sort_order: number }[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { reorderCampaigns } from '@/services/homepage-campaign.service';
import { CampaignError } from '@/lib/campaign-errors';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (auth instanceof NextResponse) return auth;
    const { items } = await req.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: '`items` must be an array' }, { status: 400 });
    }
    await reorderCampaigns(items);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CampaignError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
