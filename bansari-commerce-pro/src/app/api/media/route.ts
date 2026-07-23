// Sprint 13 — /api/media — Tags, metadata, usage, search
import { NextRequest, NextResponse } from 'next/server';
import { MediaLibraryService } from '@/services/media-library.service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const sp = req.nextUrl.searchParams;
    const action = sp.get('action');
    if (action === 'tags') {
      const tags = await MediaLibraryService.listTags(tenantId);
      return NextResponse.json({ tags });
    }
    if (action === 'search') {
      const q = sp.get('q') ?? '';
      const assets = await MediaLibraryService.searchAssets(tenantId, q);
      return NextResponse.json({ assets });
    }
    return NextResponse.json({ error: 'action required: tags | search' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
