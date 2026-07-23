// Sprint 13 — /api/processing — Job queue management
import { NextRequest, NextResponse } from 'next/server';
import { AssetProcessingService } from '@/services/asset-processing.service';
import { createClient } from '@/lib/supabase/server';
import type { DAMProcessingJob } from '@/types/dam';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const status = req.nextUrl.searchParams.get('status') as DAMProcessingJob['status'] | null;
    const jobs = await AssetProcessingService.listJobs(tenantId, status ?? undefined);
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const { asset_id, job_type, priority } = await req.json();
    const job = await AssetProcessingService.enqueueJob(tenantId, asset_id, job_type, priority ?? 5);
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
