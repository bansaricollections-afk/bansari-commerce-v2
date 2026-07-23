// Sprint 13 — /api/rights
import { NextRequest, NextResponse } from 'next/server';
import { RightsService } from '@/services/rights.service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const assetId = req.nextUrl.searchParams.get('asset_id');
    if (!assetId) {
      const expiring = await RightsService.listExpiring(tenantId);
      return NextResponse.json({ expiring });
    }
    const rights = await RightsService.getRights(tenantId, assetId);
    return NextResponse.json({ rights });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const { asset_id, ...rights } = await req.json();
    const result = await RightsService.upsertRights(tenantId, asset_id, rights);
    return NextResponse.json({ rights: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
