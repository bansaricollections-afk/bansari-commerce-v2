/**
 * GET  /api/admin/orders/[id]  — Get full order detail
 * PUT  /api/admin/orders/[id]  — Update notes
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { successResponse, errorResponse } from '@/lib/api-response';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { UpdateOrderNotesPayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const order = await OrderV2Service.getById(id);
    if (!order) return errorResponse('Order not found', 404);
    return successResponse(order);
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND') return errorResponse(err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(msg, 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateOrderNotesPayload;
    const order = await OrderV2Service.updateNotes(id, body);
    return successResponse(order);
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND') return errorResponse(err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(msg, 500);
  }
}
