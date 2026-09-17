/**
 * GET /api/admin/reviews?status=pending
 *
 * Moderation queue. Admin-gated; customer_email IS returned here, unlike the
 * storefront path, because deciding whether a review is genuine sometimes
 * means checking who sent it.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'admin.reviews' });

const STATUSES = new Set(['pending', 'approved', 'rejected', 'all']);

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const raw = new URL(request.url).searchParams.get('status') ?? 'pending';
  const status = STATUSES.has(raw) ? raw : 'pending';

  const sb = createServiceRoleClient();
  let query = sb
    .from('reviews')
    .select('id, created_at, product_id, product_name, order_id, customer_email, author_name, rating, title, body, status, verified_purchase, photos, reward_coupon_code, moderated_at, moderation_note')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    log.error('admin.reviews.list_failed', error, { requestId });
    return apiError(requestId, 'DB_ERROR', error.message, 500);
  }

  // Counts per status, so the queue can show what is waiting without a second
  // round trip from the client.
  const { data: all } = await sb.from('reviews').select('status');
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of all ?? []) {
    const s = r.status as keyof typeof counts;
    if (s in counts) counts[s] += 1;
  }

  return NextResponse.json({ success: true, requestId, status, counts, data: data ?? [] });
}
