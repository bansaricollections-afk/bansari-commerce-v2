import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import {
  ORDER_STATUSES,
  updateOrderStatus,
  type OrderStatus,
} from '@/services/order.service';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';
import { apiError } from '@/lib/api-response';
import { requireAdminSession } from '@/lib/auth/requireAdmin';

const log = createLogger({ service: 'orders.status' });

function isValidOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const rLog = log.child({ requestId });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body.', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return apiError(requestId, 'INVALID_BODY', 'Request body must be an object.', 400);
  }

  const { id, status, actor } = rawBody as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim().length === 0) {
    return apiError(requestId, 'MISSING_FIELD', 'A valid order id is required.', 400);
  }

  if (!isValidOrderStatus(status)) {
    return apiError(
      requestId,
      'INVALID_STATUS',
      `status must be one of: ${ORDER_STATUSES.join(', ')}`,
      400
    );
  }

  try {
    await updateOrderStatus(id, status);

    // Append to audit trail
    const supabase = createServiceRoleClient();
    const actorStr = typeof actor === 'string' ? actor : 'admin';
    await supabase.from('order_audit_trail').insert({
      order_id: id,
      event: status,
      actor: actorStr,
      metadata: { requestId },
    });

    rLog.info('orders.status.updated', { orderId: id, status, actor: actorStr });
  } catch (error) {
    rLog.error('orders.status.failed', error, { orderId: id, status });
    return apiError(
      requestId,
      'DB_ERROR',
      error instanceof Error ? error.message : 'Unable to update order status.',
      500
    );
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');

  return NextResponse.json({ success: true, requestId }, { status: 200 });
}
