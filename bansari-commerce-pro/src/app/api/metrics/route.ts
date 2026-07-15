import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { getProductionMetrics } from '@/lib/metrics';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.metrics' });

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const metrics = await getProductionMetrics();
    log.info('metrics.fetched', { requestId, userId: auth.userId });
    return NextResponse.json(
      { success: true, requestId, ...metrics },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    log.error('metrics.failed', err, { requestId, userId: auth.userId });
    return apiError(requestId, 'METRICS_ERROR', 'Failed to fetch metrics', 500);
  }
}
