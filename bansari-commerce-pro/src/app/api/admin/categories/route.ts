import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.categories' });

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    log.error('admin.categories.get.failed', error, { requestId });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const cat = (row.category as string) ?? 'Uncategorised';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const categories = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));

  return NextResponse.json({ success: true, requestId, data: categories });
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const { oldName, newName } = body as { oldName?: unknown; newName?: unknown };

  if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
    return apiError(requestId, 'MISSING_FIELD', 'oldName is required and must be a non-empty string', 400);
  }
  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return apiError(requestId, 'MISSING_FIELD', 'newName is required and must be a non-empty string', 400);
  }
  if (oldName.trim() === newName.trim()) {
    return apiError(requestId, 'INVALID_FIELD', 'oldName and newName must differ', 400);
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('products')
    .update({ category: newName.trim(), updated_at: new Date().toISOString() })
    .eq('category', oldName.trim());

  if (error) {
    log.error('admin.categories.patch.failed', error, { requestId });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  // Admin audit log
  await supabase.from('admin_audit_log').insert({
    action: 'category_rename',
    entity_type: 'category',
    entity_id: oldName.trim(),
    user_id: (auth as { userId: string }).userId,
    metadata: { oldName, newName, requestId },
  });

  log.info('admin.categories.patch.ok', { oldName, newName, requestId });

  return NextResponse.json({ success: true, requestId, oldName, newName });
}
