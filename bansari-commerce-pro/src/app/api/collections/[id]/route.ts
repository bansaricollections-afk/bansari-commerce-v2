// Sprint 13 — /api/collections/[id]
// REPAIR RC#4: Use inline params type compatible with Next.js 16 RouteHandlerContext
// Delta only

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CollectionService } from '@/services/collection.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const collectionService = new CollectionService(supabase);
    const collection = await collectionService.getCollection(id);
    if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    return NextResponse.json(collection);
  } catch (err) {
    console.error('[GET /api/collections/[id]]', err);
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
    const collectionService = new CollectionService(supabase);
    const collection = await collectionService.updateCollection(id, body);

    return NextResponse.json(collection);
  } catch (err) {
    console.error('[PATCH /api/collections/[id]]', err);
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

    const collectionService = new CollectionService(supabase);
    await collectionService.deleteCollection(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/collections/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
