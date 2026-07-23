// Sprint 13 — /api/collections
import { NextRequest, NextResponse } from 'next/server';
import { CollectionService } from '@/services/collection.service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });
    const collections = await CollectionService.listCollections(tenantId);
    return NextResponse.json({ collections });
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
    const { name, description, is_smart, smart_rules } = await req.json();
    const collection = await CollectionService.createCollection(
      tenantId, name, description ?? null, is_smart ?? false, smart_rules ?? null, user.id
    );
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
