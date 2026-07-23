import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MediaLibraryService } from '@/services/media-library.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const folderId = searchParams.get('folder_id') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '24');

    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const mediaService = new MediaLibraryService(supabase);
    const result = await mediaService.browse({ tenantId, folderId, search, page, limit });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/media]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const mediaService = new MediaLibraryService(supabase);

    if (body.action === 'create_folder') {
      const folder = await mediaService.createFolder({ ...body, createdBy: user.id });
      return NextResponse.json(folder, { status: 201 });
    }

    if (body.action === 'move') {
      await mediaService.moveAsset(body.assetId, body.targetFolderId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/media]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
