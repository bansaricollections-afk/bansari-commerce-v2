/**
 * POST /api/admin/orders/[id]/exchange
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { ExchangePayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  try {
    const body = (await request.json()) as Omit<ExchangePayload, 'actorId' | 'actorName'>;
    const order = await OrderV2Service.requestExchange(id, {
      ...body,
      actorId:   auth.userId,
      actorName: auth.email,
    });
    return apiSuccess({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      const status = err.code === 'NOT_FOUND' ? 404
        : err.code === 'EXCHANGE_NOT_ALLOWED' || err.code === 'INVALID_STATUS_TRANSITION' ? 422
        : 500;
      return apiError(requestId, err.code, err.message, status);
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
