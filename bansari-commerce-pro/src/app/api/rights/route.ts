import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RightsService } from '@/services/rights.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const assetId = searchParams.get('asset_id') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const rightsService = new RightsService(supabase);
    const result = await rightsService.listRights({ tenantId, assetId, page, limit });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/rights]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const rightsService = new RightsService(supabase);
    const rights = await rightsService.createRights({ ...body, createdBy: user.id });

    return NextResponse.json(rights, { status: 201 });
  } catch (err) {
    console.error('[POST /api/rights]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
