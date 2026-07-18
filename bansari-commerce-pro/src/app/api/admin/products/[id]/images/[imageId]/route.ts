import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';

const log = createLogger({ service: 'admin.products.images' });

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

// ─── PUT /api/admin/products/[id]/images/[imageId] ───────────────────────────
// Supports updating alt text, sort_order, or image type
export async function PUT(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { imageId: rawIid } = await context.params;
  const imageId = Number(rawIid);
  if (!Number.isInteger(imageId) || imageId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'imageId must be a positive integer', 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  try {
    const sb = createServiceRoleClient();
    const patch = body as Record<string, unknown>;
    const { data, error } = await sb
      .from('product_images')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', imageId)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return apiError(requestId, 'NOT_FOUND', 'Image not found', 404);

    await sb.from('admin_audit_log').insert({
      action: 'product_image_update',
      entity_type: 'product_image',
      entity_id: String(imageId),
      user_id: userId,
      metadata: { updatedFields: Object.keys(patch), requestId },
    });

    log.info('admin.products.images.update.ok', { imageId, requestId });
    return NextResponse.json({ success: true, requestId, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.images.update.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── DELETE /api/admin/products/[id]/images/[imageId] ────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { imageId: rawIid } = await context.params;
  const imageId = Number(rawIid);
  if (!Number.isInteger(imageId) || imageId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'imageId must be a positive integer', 400);

  try {
    await ProductV2Service.removeImage(imageId);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'product_image_remove',
      entity_type: 'product_image',
      entity_id: String(imageId),
      user_id: userId,
      metadata: { requestId },
    });

    log.info('admin.products.images.delete.ok', { imageId, requestId });
    return NextResponse.json({ success: true, requestId, imageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.images.delete.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
