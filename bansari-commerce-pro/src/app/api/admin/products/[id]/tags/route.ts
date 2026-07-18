import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';

const log = createLogger({ service: 'admin.products.tags' });

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/admin/products/[id]/tags ──────────────────────────────────────────
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
      .from('product_tags')
      .select('product_id, tags(id, name, slug)')
      .eq('product_id', productId);

    if (error) throw new Error(error.message);
    const tags = (data ?? []).map((r) => (r as { tags: unknown }).tags).filter(Boolean);
    return NextResponse.json({ success: true, requestId, data: tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.tags.list.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── POST /api/admin/products/[id]/tags ─────────────────────────────────────────
// Body: { tagIds: number[] }
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

  const { tagIds } = body as { tagIds?: unknown };
  if (!Array.isArray(tagIds) || tagIds.length === 0)
    return apiError(requestId, 'MISSING_FIELD', 'tagIds must be a non-empty array of integers', 400);

  const validTagIds = tagIds.filter((t) => Number.isInteger(t) && t > 0) as number[];
  if (validTagIds.length === 0)
    return apiError(requestId, 'INVALID_FIELD', 'tagIds must contain valid positive integers', 400);

  try {
    // addTag upserts one tag at a time; run in parallel
    await Promise.all(validTagIds.map((tagId) => ProductV2Service.addTag(productId, tagId)));

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'product_tags_attach',
      entity_type: 'product',
      entity_id: String(productId),
      user_id: userId,
      metadata: { tagIds: validTagIds, requestId },
    });

    log.info('admin.products.tags.attach.ok', { productId, tagIds: validTagIds, requestId });
    return NextResponse.json({ success: true, requestId, productId, tagIds: validTagIds }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.tags.attach.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
