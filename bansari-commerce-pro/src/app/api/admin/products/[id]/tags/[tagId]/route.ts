import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';

const log = createLogger({ service: 'admin.products.tags' });

type RouteContext = { params: Promise<{ id: string; tagId: string }> };

// ─── DELETE /api/admin/products/[id]/tags/[tagId] ────────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  const { id: rawId, tagId: rawTid } = await context.params;
  const productId = Number(rawId);
  const tagId     = Number(rawTid);

  if (!Number.isInteger(productId) || productId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'id must be a positive integer', 400);
  if (!Number.isInteger(tagId) || tagId < 1)
    return apiError(requestId, 'INVALID_PARAM', 'tagId must be a positive integer', 400);

  try {
    await ProductV2Service.removeTag(productId, tagId);

    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'product_tag_detach',
      entity_type: 'product',
      entity_id: String(productId),
      user_id: userId,
      metadata: { tagId, requestId },
    });

    log.info('admin.products.tags.detach.ok', { productId, tagId, requestId });
    return NextResponse.json({ success: true, requestId, productId, tagId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.tags.detach.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}
