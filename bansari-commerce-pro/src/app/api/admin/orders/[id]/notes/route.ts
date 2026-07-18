/**
 * PATCH /api/admin/orders/[id]/notes
 *
 * Update any combination of internalNotes, customerNotes, packingNotes.
 * All three fields are optional — only supplied fields are written.
 * Passing null explicitly clears that field.
 *
 * Body: {
 *   internalNotes?: string | null;
 *   customerNotes?: string | null;
 *   packingNotes?:  string | null;
 * }
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { OrderV2Service } from '@/services/order-v2.service';
import { OrderError } from '@/lib/order-errors';
import type { UpdateOrderNotesPayload } from '@/types/order-v2';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const requestId = generateRequestId();
  const { id } = await params;

  let body: Partial<UpdateOrderNotesPayload>;
  try {
    body = (await request.json()) as Partial<UpdateOrderNotesPayload>;
  } catch {
    return apiError(requestId, 'BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const hasAny =
    'internalNotes' in body ||
    'customerNotes' in body ||
    'packingNotes'  in body;

  if (!hasAny) {
    return apiError(
      requestId,
      'BAD_REQUEST',
      'At least one of internalNotes, customerNotes, or packingNotes must be provided',
      400
    );
  }

  try {
    const order = await OrderV2Service.updateNotes(id, body as UpdateOrderNotesPayload);
    return apiSuccess({ order });
  } catch (err) {
    if (err instanceof OrderError && err.code === 'NOT_FOUND')
      return apiError(requestId, 'NOT_FOUND', err.message, 404);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL', msg, 500);
  }
}
