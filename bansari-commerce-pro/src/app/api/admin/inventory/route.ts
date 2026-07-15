import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.inventory' });

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, category, stock, price, is_active')
    .order('stock', { ascending: true });

  if (error) {
    log.error('admin.inventory.get.failed', error, { requestId });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  return NextResponse.json({ success: true, requestId, data });
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const rLog = log.child({ requestId, userId: (auth as { userId: string }).userId });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const { id, stock } = body as { id?: unknown; stock?: unknown };

  if (!id || typeof id !== 'string') {
    return apiError(requestId, 'MISSING_FIELD', 'id is required and must be a string', 400);
  }
  if (stock === undefined || typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
    return apiError(requestId, 'INVALID_FIELD', 'stock is required and must be a non-negative integer', 400);
  }

  const supabase = createServiceRoleClient();

  // Fetch current stock for audit log delta
  const { data: current, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, stock, price')
    .eq('id', id)
    .single();

  if (fetchErr || !current) {
    rLog.error('admin.inventory.patch.fetch_failed', fetchErr);
    return apiError(requestId, 'NOT_FOUND', 'Product not found.', 404);
  }

  const previousStock = current.stock as number;

  const { data, error } = await supabase
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, stock')
    .single();

  if (error) {
    rLog.error('admin.inventory.patch.failed', error, { productId: id });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  // Admin audit log
  await supabase.from('admin_audit_log').insert({
    action: 'stock_change',
    entity_type: 'product',
    entity_id: id,
    user_id: (auth as { userId: string }).userId,
    metadata: { previousStock, newStock: stock, requestId },
  });

  rLog.info('admin.inventory.patch.ok', { productId: id, previousStock, newStock: stock });

  return NextResponse.json({ success: true, requestId, data });
}
