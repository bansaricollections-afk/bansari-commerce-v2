import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    console.error('[GET /api/admin/categories]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count products per category
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const cat = (row.category as string) ?? 'Uncategorised';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const categories = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return NextResponse.json(categories);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { oldName, newName } = body as { oldName?: unknown; newName?: unknown };

  if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
    return NextResponse.json(
      { error: 'oldName is required and must be a non-empty string' },
      { status: 400 }
    );
  }
  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return NextResponse.json(
      { error: 'newName is required and must be a non-empty string' },
      { status: 400 }
    );
  }
  if (oldName.trim() === newName.trim()) {
    return NextResponse.json(
      { error: 'oldName and newName must differ' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('products')
    .update({ category: newName.trim(), updated_at: new Date().toISOString() })
    .eq('category', oldName.trim());

  if (error) {
    console.error('[PATCH /api/admin/categories]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, oldName, newName });
}
