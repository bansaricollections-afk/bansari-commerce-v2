// Sprint 13 — /api/assets/[id]
// REPAIR RC#4: Use inline params type compatible with Next.js 16 RouteHandlerContext
// Delta only

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAMService } from '@/services/dam.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const damService = new DAMService(supabase);
    const asset = await damService.getAsset(id);
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    return NextResponse.json(asset);
  } catch (err) {
    console.error('[GET /api/assets/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const damService = new DAMService(supabase);
    const asset = await damService.updateAsset(id, body);

    return NextResponse.json(asset);
  } catch (err) {
    console.error('[PATCH /api/assets/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const damService = new DAMService(supabase);
    await damService.deleteAsset(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assets/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
