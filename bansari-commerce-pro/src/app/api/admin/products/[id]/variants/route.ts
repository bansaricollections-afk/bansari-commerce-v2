import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';
import type { CreateVariantPayload } from '@/types/product-v2';

const log = createLogger({ service: 'admin.products.variants' });

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/admin/products/[id]/variants ────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await context.params;
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'id must be a positive integer', 400);

  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, requestId, data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.variants.list.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── POST /api/admin/products/[id]/variants ───────────────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id: rawId } = await context.params;
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'id must be a positive integer', 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  try {
    const payload = body as Omit<CreateVariantPayload, 'product_id'>;
    const variant = await ProductV2Service.addVariant(productId, payload as CreateVariantPayload);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'variant_create',
      entity_type: 'product_variant',
      entity_id: String(variant.id),
      user_id: userId,
      metadata: { productId, sku: variant.sku, requestId },
    });

    log.info('admin.products.variants.create.ok', { productId, variantId: variant.id, requestId });
    return NextResponse.json({ success: true, requestId, data: variant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as { code?: string }).code ?? 'INTERNAL';
    log.error('admin.products.variants.create.failed', err, { requestId });
    return apiError(requestId, code, message, code === 'DUPLICATE_SKU' ? 409 : 500);
  }
}
