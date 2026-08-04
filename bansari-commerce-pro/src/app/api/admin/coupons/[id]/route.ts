import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.coupons' });

type RouteContext = { params: Promise<{ id: string }> };

// ─── PUT /api/admin/coupons/[id] ─────────────────────────────────────────────
export async function PUT(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id } = await context.params;
  if (!id) return apiError(requestId, 'INVALID_PARAM', 'id is required', 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  // Build a partial update — only include fields that were sent
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.code === 'string') patch.code = body.code.trim().toUpperCase();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (body.discount_type === 'percentage' || body.discount_type === 'flat') patch.discount_type = body.discount_type;
  if (body.discount_value != null) {
    const v = Number(body.discount_value);
    if (!Number.isFinite(v) || v <= 0) return apiError(requestId, 'VALIDATION', 'discount_value must be a positive number', 422);
    patch.discount_value = v;
  }
  if (body.min_order   != null) patch.min_order  = Number(body.min_order);
  if (body.max_uses    != null) patch.max_uses   = body.max_uses === '' ? null : Number(body.max_uses);
  if (body.active      != null) patch.active     = Boolean(body.active);
  if (body.expires_at  != null) patch.expires_at = body.expires_at === '' ? null : String(body.expires_at);

  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('coupons')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return apiError(requestId, 'NOT_FOUND', 'Coupon not found', 404);
      if (error.code === '23505')    return apiError(requestId, 'DUPLICATE_CODE', 'That coupon code already exists', 409);
      throw new Error(error.message);
    }

    await sb.from('admin_audit_log').insert({
      action:      'coupon_update',
      entity_type: 'coupon',
      entity_id:   id,
      user_id:     userId,
      metadata:    { updatedFields: Object.keys(patch), requestId },
    });

    log.info('admin.coupons.update.ok', { id, requestId });
    return NextResponse.json({ success: true, requestId, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.coupons.update.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── DELETE /api/admin/coupons/[id] ──────────────────────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id } = await context.params;
  if (!id) return apiError(requestId, 'INVALID_PARAM', 'id is required', 400);

  try {
    const sb = createServiceRoleClient();
    const { error } = await sb.from('coupons').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await sb.from('admin_audit_log').insert({
      action:      'coupon_delete',
      entity_type: 'coupon',
      entity_id:   id,
      user_id:     userId,
      metadata:    { requestId },
    });

    log.info('admin.coupons.delete.ok', { id, requestId });
    return NextResponse.json({ success: true, requestId, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.coupons.delete.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
