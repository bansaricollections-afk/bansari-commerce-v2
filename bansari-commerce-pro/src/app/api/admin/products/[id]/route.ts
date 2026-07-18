import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';
import type { UpdateProductV2Payload } from '@/types/product-v2';

const log = createLogger({ service: 'admin.products' });

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string, requestId: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return { error: apiError(requestId, 'INVALID_PARAM', 'id must be a positive integer', 400) };
  }
  return { id };
}

// ─── GET /api/admin/products/[id] ────────────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const parsed = parseId(rawId, requestId);
  if ('error' in parsed) return parsed.error;

  const withAttributes = new URL(request.url).searchParams.get('withAttributes') === 'true';

  try {
    const product = await ProductV2Service.getById(parsed.id, { withAttributes });
    if (!product) return apiError(requestId, 'NOT_FOUND', 'Product not found', 404);
    log.info('admin.products.get.ok', { id: parsed.id, requestId });
    return NextResponse.json({ success: true, requestId, data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.get.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── PUT /api/admin/products/[id] ─────────────────────────────────────────────
export async function PUT(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id: rawId } = await context.params;
  const parsed = parseId(rawId, requestId);
  if ('error' in parsed) return parsed.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  try {
    const payload = body as UpdateProductV2Payload;
    payload.updated_by = userId;

    const product = await ProductV2Service.update(parsed.id, payload);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'product_update',
      entity_type: 'product',
      entity_id: String(parsed.id),
      user_id: userId,
      metadata: { updatedFields: Object.keys(payload), requestId },
    });

    log.info('admin.products.update.ok', { id: parsed.id, requestId });
    return NextResponse.json({ success: true, requestId, data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as { code?: string }).code ?? 'INTERNAL';
    log.error('admin.products.update.failed', err, { requestId });
    const statusMap: Record<string, number> = {
      VALIDATION: 422, DUPLICATE_SKU: 409, DUPLICATE_SLUG: 409, NOT_FOUND: 404, INTERNAL: 500,
    };
    return apiError(requestId, code, message, statusMap[code] ?? 500);
  }
}

// ─── DELETE /api/admin/products/[id] ─────────────────────────────────────────
// ?hard=true  → permanent deletion (default: soft-delete by setting active=false)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id: rawId } = await context.params;
  const parsed = parseId(rawId, requestId);
  if ('error' in parsed) return parsed.error;

  const hard = new URL(request.url).searchParams.get('hard') === 'true';

  try {
    const sb = createServiceRoleClient();

    if (hard) {
      const { error } = await sb.from('products').delete().eq('id', parsed.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from('products')
        .update({ active: false, updated_at: new Date().toISOString(), updated_by: userId } as Record<string, unknown>)
        .eq('id', parsed.id);
      if (error) throw new Error(error.message);
    }

    await sb.from('admin_audit_log').insert({
      action: hard ? 'product_hard_delete' : 'product_soft_delete',
      entity_type: 'product',
      entity_id: String(parsed.id),
      user_id: userId,
      metadata: { hard, requestId },
    });

    log.info('admin.products.delete.ok', { id: parsed.id, hard, requestId });
    return NextResponse.json({ success: true, requestId, id: parsed.id, hard });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.delete.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
