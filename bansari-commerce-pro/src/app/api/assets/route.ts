// Sprint 13 — /api/assets
// REPAIR RC#5: Replace File type (DOM) with Web API globalThis.File check + explicit typing
// Delta only

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAMService } from '@/services/dam.service';
import { AssetProcessingService } from '@/services/asset-processing.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const folderId = searchParams.get('folder_id') ?? undefined;
    const collectionId = searchParams.get('collection_id') ?? undefined;
    const tags = searchParams.get('tags')?.split(',') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '24');

    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const damService = new DAMService(supabase);
    const result = await damService.listAssets({ tenantId, folderId, collectionId, tags, page, limit });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();

    // REPAIR RC#5: Use FormDataEntryValue narrowing instead of `as File`
    const fileEntry = formData.get('file');
    const tenantId = formData.get('tenant_id');
    const organizationId = formData.get('organization_id');
    const folderId = formData.get('folder_id');
    const assetType = formData.get('asset_type');
    const altText = formData.get('alt_text');
    const title = formData.get('title');

    if (!fileEntry || typeof fileEntry === 'string' || !tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ error: 'file and tenant_id are required' }, { status: 400 });
    }

    // fileEntry is now narrowed to Blob (File extends Blob, available in Node 18+ / Edge runtime)
    const file = fileEntry as Blob & { name: string; type: string; size: number };

    const damService = new DAMService(supabase);
    const processingService = new AssetProcessingService(supabase);

    const asset = await damService.uploadAsset({
      file: file as Parameters<typeof damService.uploadAsset>[0]['file'],
      tenantId,
      organizationId: typeof organizationId === 'string' ? organizationId : undefined,
      folderId: typeof folderId === 'string' ? folderId : undefined,
      assetType: typeof assetType === 'string' ? assetType : 'image',
      altText: typeof altText === 'string' ? altText : undefined,
      title: typeof title === 'string' ? title : undefined,
      uploadedBy: user.id,
    });

    await processingService.enqueueProcessing(
      asset.id,
      tenantId,
      ['auto_tag', 'color_analysis', 'quality_score', 'thumbnail'],
    );

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
