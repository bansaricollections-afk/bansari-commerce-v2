/**
 * GET  /api/admin/orders/[id]/timeline  — Get full timeline
 * POST /api/admin/orders/[id]/timeline  — Add a note to the timeline
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  try {
    const timeline = await OrderV2Service.getTimeline(id);
    return apiSuccess({ timeline });
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND')
      return apiError(requestId, 'NOT_FOUND', err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;
  try {
    const body = (await request.json()) as { note: string; metadata?: Record<string, unknown> };
    if (!body.note?.trim())
      return apiError(requestId, 'BAD_REQUEST', 'note is required', 400);

    const entry = await OrderV2Service.addTimelineNote(id, {
      note:      body.note,
      metadata:  body.metadata,
      actorId:   auth.userId,
      actorName: auth.email,
    });
    return apiSuccess({ entry }, 201);
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND')
      return apiError(requestId, 'NOT_FOUND', err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
