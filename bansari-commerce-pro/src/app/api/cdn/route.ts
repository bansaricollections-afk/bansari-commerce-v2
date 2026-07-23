// Sprint 13 — /api/cdn — Signed URLs, transform URLs, cache invalidation
import { NextRequest, NextResponse } from 'next/server';
import { CDNService } from '@/services/cdn.service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const action = body.action as string;

    if (action === 'signed_url') {
      const url = await CDNService.getSignedUrl(body.storage_path, body.options ?? {});
      return NextResponse.json({ url });
    }
    if (action === 'transform_url') {
      const url = CDNService.buildTransformUrl(body.storage_path, body.transform ?? {});
      return NextResponse.json({ url });
    }
    if (action === 'srcset') {
      const srcset = CDNService.buildSrcSet(body.storage_path, body.widths);
      return NextResponse.json({ srcset });
    }
    if (action === 'invalidate') {
      await CDNService.invalidateCache(body.paths ?? []);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
