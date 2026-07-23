import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAMService } from '@/services/dam.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const assetType = searchParams.get('asset_type') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const damService = new DAMService(supabase);
    const result = await damService.listAssets({ tenantId, page, limit, assetType, search });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/dam]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const damService = new DAMService(supabase);
    const asset = await damService.createAsset({ ...body, uploadedBy: user.id });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error('[POST /api/dam]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
