import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CDNService } from '@/services/cdn.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('asset_id');
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined;
    const height = searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined;
    const format = (searchParams.get('format') as 'webp' | 'avif' | 'jpeg' | 'png') ?? 'webp';
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : 85;

    if (!assetId) return NextResponse.json({ error: 'asset_id required' }, { status: 400 });

    const cdnService = new CDNService(supabase);
    const url = await cdnService.getTransformedUrl(assetId, { width, height, format, quality });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[GET /api/cdn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const cdnService = new CDNService(supabase);

    if (body.action === 'invalidate') {
      await cdnService.invalidateCache(body.assetId);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'signed_url') {
      const signedUrl = await cdnService.getSignedUrl(body.assetId, body.expiresIn ?? 3600);
      return NextResponse.json({ url: signedUrl });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/cdn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
