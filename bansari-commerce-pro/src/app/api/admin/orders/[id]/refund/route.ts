/**
 * POST /api/admin/orders/[id]/refund
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { successResponse, errorResponse } from '@/lib/api-response';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { RefundPayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const body = (await request.json()) as Omit<RefundPayload, 'actorId' | 'actorName'>;
    const order = await OrderV2Service.refund(id, {
      ...body,
      actorId:   auth.userId,
      actorName: auth.email,
    });
    return successResponse(order);
  } catch (err) {
    if (err instanceof OrderError) {
      const status = err.code === 'NOT_FOUND' ? 404
        : err.code === 'INVALID_REFUND_AMOUNT' || err.code === 'ALREADY_REFUNDED' ? 422
        : 500;
      return errorResponse(err.message, status);
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(msg, 500);
  }
}
