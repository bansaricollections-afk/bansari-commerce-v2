// Sprint 13 — /api/assets/[id]/approve
// REPAIR: Use instance pattern (new DAMService(supabase)) — not static call
// Delta only

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAMService } from '@/services/dam.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ error: 'x-tenant-id required' }, { status: 400 });

    const { id } = await params;

    const damService = new DAMService(supabase);
    await damService.approveAsset(tenantId, id, user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/assets/[id]/approve]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
