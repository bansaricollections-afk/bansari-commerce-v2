import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';
import type { UpdateVariantPayload } from '@/types/product-v2';

const log = createLogger({ service: 'admin.products.variants' });

type RouteContext = { params: Promise<{ id: string; variantId: string }> };

// ─── PUT /api/admin/products/[id]/variants/[variantId] ────────────────────────
export async function PUT(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { variantId: rawVid } = await context.params;
  const variantId = Number(rawVid);
  if (!Number.isInteger(variantId) || variantId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'variantId must be a positive integer', 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  try {
    const payload = body as UpdateVariantPayload;
    const variant = await ProductV2Service.updateVariant(variantId, payload);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'variant_update',
      entity_type: 'product_variant',
      entity_id: String(variantId),
      user_id: userId,
      metadata: { updatedFields: Object.keys(payload), requestId },
    });

    log.info('admin.products.variants.update.ok', { variantId, requestId });
    return NextResponse.json({ success: true, requestId, data: variant });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as { code?: string }).code ?? 'INTERNAL';
    log.error('admin.products.variants.update.failed', err, { requestId });
    return apiError(requestId, code, message, code === 'NOT_FOUND' ? 404 : 500);
  }
}

// ─── DELETE /api/admin/products/[id]/variants/[variantId] ────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { variantId: rawVid } = await context.params;
  const variantId = Number(rawVid);
  if (!Number.isInteger(variantId) || variantId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'variantId must be a positive integer', 400);

  try {
    await ProductV2Service.deleteVariant(variantId);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'variant_delete',
      entity_type: 'product_variant',
      entity_id: String(variantId),
      user_id: userId,
      metadata: { requestId },
    });

    log.info('admin.products.variants.delete.ok', { variantId, requestId });
    return NextResponse.json({ success: true, requestId, variantId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.variants.delete.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
