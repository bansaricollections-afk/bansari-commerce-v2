/**
 * POST /api/admin/orders/[id]/ship
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { successResponse, errorResponse } from '@/lib/api-response';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { ShipOrderPayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const body = (await request.json()) as Omit<ShipOrderPayload, 'actorId' | 'actorName'>;
    const order = await OrderV2Service.ship(id, {
      ...body,
      actorId:   auth.userId,
      actorName: auth.email,
    });
    return successResponse(order);
  } catch (err) {
    if (err instanceof OrderError) {
      const status = err.code === 'NOT_FOUND' ? 404
        : ['INVALID_STATUS_TRANSITION','COURIER_REQUIRED','AWB_REQUIRED'].includes(err.code) ? 422
        : 500;
      return errorResponse(err.message, status);
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(msg, 500);
  }
}
