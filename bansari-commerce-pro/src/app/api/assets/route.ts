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
    const file = formData.get('file') as File | null;
    const tenantId = formData.get('tenant_id') as string | null;
    const organizationId = formData.get('organization_id') as string | null;
    const folderId = formData.get('folder_id') as string | null;
    const assetType = formData.get('asset_type') as string | null;
    const altText = formData.get('alt_text') as string | null;
    const title = formData.get('title') as string | null;

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'file and tenant_id are required' }, { status: 400 });
    }

    const damService = new DAMService(supabase);
    const processingService = new AssetProcessingService(supabase);

    const asset = await damService.uploadAsset({
      file,
      tenantId,
      organizationId: organizationId ?? undefined,
      folderId: folderId ?? undefined,
      assetType: assetType ?? 'image',
      altText: altText ?? undefined,
      title: title ?? undefined,
      uploadedBy: user.id,
    });

    // Enqueue background AI processing
    await processingService.enqueueProcessing(asset.id, tenantId, ['auto_tag', 'color_analysis', 'quality_score', 'thumbnail']);

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
