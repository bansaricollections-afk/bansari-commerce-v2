// Sprint 13 — /api/assets — List + upload metadata
import { NextRequest, NextResponse } from 'next/server';
import { DAMService } from '@/services/dam.service';
import { AssetProcessingService } from '@/services/asset-processing.service';
import { createClient } from '@/lib/supabase/server';
import type { ListAssetsQuery, UploadAssetInput } from '@/types/dam';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const sp = req.nextUrl.searchParams;
    const query: ListAssetsQuery = {
      tenant_id: tenantId,
      folder_id: sp.get('folder_id') ?? undefined,
      asset_type: (sp.get('asset_type') as ListAssetsQuery['asset_type']) ?? undefined,
      status: (sp.get('status') as ListAssetsQuery['status']) ?? undefined,
      search: sp.get('search') ?? undefined,
      page: Number(sp.get('page') ?? 1),
      limit: Number(sp.get('limit') ?? 50),
      sort_by: (sp.get('sort_by') as ListAssetsQuery['sort_by']) ?? 'created_at',
      sort_order: (sp.get('sort_order') as 'asc' | 'desc') ?? 'desc',
    };
    const result = await DAMService.listAssets(query);
    return NextResponse.json(result);
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
    const body = await req.json() as {
      input: UploadAssetInput;
      storage_path: string;
      mime_type: string;
      file_size: number;
      checksum: string;
    };
    const asset = await DAMService.createAsset(
      tenantId, body.input, body.storage_path,
      body.mime_type, body.file_size, body.checksum, user.id
    );
    // Enqueue default processing pipeline
    await AssetProcessingService.enqueueDefaultPipeline(tenantId, asset.id, body.mime_type);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
