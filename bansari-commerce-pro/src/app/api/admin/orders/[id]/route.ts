/**
 * GET  /api/admin/orders/[id]  — Get full order detail
 * PUT  /api/admin/orders/[id]  — Update notes
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { UpdateOrderNotesPayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  try {
    const order = await OrderV2Service.getById(id);
    if (!order) return apiError(requestId, 'NOT_FOUND', 'Order not found', 404);
    return apiSuccess({ order });
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND')
      return apiError(requestId, 'NOT_FOUND', err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateOrderNotesPayload;
    const order = await OrderV2Service.updateNotes(id, body);
    return apiSuccess({ order });
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND')
      return apiError(requestId, 'NOT_FOUND', err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
