import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.coupons' });

// ─── GET /api/admin/coupons ──────────────────────────────────────────────────
// Query params (all optional):
//   active  → 'true' | 'false'   filter by active flag
//   q       → code/description text search
//   page    → 0-based (default 0)
//   limit   → default 50
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const sp   = new URL(request.url).searchParams;
  const page  = Math.max(0, Number(sp.get('page')  ?? 0));
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const from  = page * limit;
  const to    = from + limit - 1;

  try {
    const sb = createServiceRoleClient();
    let query = sb
      .from('coupons')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    const activeParam = sp.get('active');
    if (activeParam === 'true')  query = query.eq('active', true);
    if (activeParam === 'false') query = query.eq('active', false);

    const q = sp.get('q')?.trim();
    if (q) {
      query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    log.info('admin.coupons.list.ok', { page, limit, total: count ?? 0, requestId });
    return NextResponse.json({
      success: true,
      requestId,
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize: limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.coupons.list.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── POST /api/admin/coupons ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return apiError(requestId, 'VALIDATION', 'code is required', 422);

  const discountType = body.discount_type as string | undefined;
  if (discountType !== 'percentage' && discountType !== 'flat') {
    return apiError(requestId, 'VALIDATION', 'discount_type must be "percentage" or "flat"', 422);
  }

  const discountValue = Number(body.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return apiError(requestId, 'VALIDATION', 'discount_value must be a positive number', 422);
  }

  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('coupons')
      .insert({
        code,
        description:    typeof body.description    === 'string' ? body.description.trim()    : null,
        discount_type:  discountType,
        discount_value: discountValue,
        min_order:      body.min_order      != null ? Number(body.min_order)      : 0,
        max_uses:       body.max_uses       != null ? Number(body.max_uses)       : null,
        active:         body.active         != null ? Boolean(body.active)        : true,
        expires_at:     typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError(requestId, 'DUPLICATE_CODE', `Coupon code "${code}" already exists`, 409);
      }
      throw new Error(error.message);
    }

    await sb.from('admin_audit_log').insert({
      action:      'coupon_create',
      entity_type: 'coupon',
      entity_id:   data.id,
      user_id:     userId,
      metadata:    { code: data.code, requestId },
    });

    log.info('admin.coupons.create.ok', { id: data.id, code: data.code, requestId });
    return NextResponse.json({ success: true, requestId, data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.coupons.create.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
