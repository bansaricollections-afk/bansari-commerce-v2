import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, category, stock, price, is_active')
    .order('stock', { ascending: true });

  if (error) {
    console.error('[GET /api/admin/inventory]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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

  const { id, stock } = body as { id?: unknown; stock?: unknown };

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required and must be a string' }, { status: 400 });
  }
  if (stock === undefined || typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json(
      { error: 'stock is required and must be a non-negative integer' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, stock')
    .single();

  if (error) {
    console.error('[PATCH /api/admin/inventory]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
