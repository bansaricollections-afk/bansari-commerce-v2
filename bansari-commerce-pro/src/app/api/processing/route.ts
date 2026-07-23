import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AssetProcessingService } from '@/services/asset-processing.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const status = searchParams.get('status') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const processingService = new AssetProcessingService(supabase);
    const jobs = await processingService.listJobs({ tenantId, status, page, limit });

    return NextResponse.json(jobs);
  } catch (err) {
    console.error('[GET /api/processing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { assetId, tenantId, operations } = body as {
      assetId: string;
      tenantId: string;
      operations: string[];
    };

    if (!assetId || !tenantId || !operations?.length) {
      return NextResponse.json({ error: 'assetId, tenantId and operations are required' }, { status: 400 });
    }

    const processingService = new AssetProcessingService(supabase);
    const job = await processingService.enqueueProcessing(assetId, tenantId, operations);

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error('[POST /api/processing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
