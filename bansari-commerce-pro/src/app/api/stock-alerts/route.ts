/**
 * POST /api/stock-alerts — "notify me when this size is back".
 *
 * Public and unauthenticated, and it stores an email address, so it is
 * defensive: rate limited per IP, capped lengths, and the product (and size,
 * when given) must be real and active. A repeat request is accepted silently.
 */
import { type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateRequestId } from '@/lib/request-id';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger({ service: 'stock-alerts' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const posInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const limited = checkRateLimit(request, 'stock-alerts', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const productId = posInt(body.productId);
  const variantId = body.variantId == null ? null : posInt(body.variantId);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!productId || (body.variantId != null && !variantId)) {
    return apiError(requestId, 'VALIDATION', 'Invalid product.', 422);
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return apiError(requestId, 'EMAIL_INVALID', 'Please enter a valid email address.', 422);
  }

  const sb = createServiceRoleClient();

  const { data: product } = await sb
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle();
  if (!product) return apiError(requestId, 'NOT_FOUND', 'Product not found.', 404);

  // The size label is read from the database, never trusted from the client.
  let sizeLabel: string | null = null;
  if (variantId) {
    const { data: variant } = await sb
      .from('product_variants')
      .select('id, product_id, size_label, size_master(name)')
      .eq('id', variantId)
      .maybeSingle();
    if (!variant || Number(variant.product_id) !== productId) {
      return apiError(requestId, 'VALIDATION', 'Invalid size.', 422);
    }
    const master = (variant as { size_master?: { name?: string } | { name?: string }[] | null }).size_master;
    const masterName = Array.isArray(master) ? master[0]?.name : master?.name;
    sizeLabel = (variant.size_label as string | null) ?? masterName ?? null;
  }

  const { error } = await sb.from('stock_alerts').insert({
    product_id: productId,
    variant_id: variantId,
    size_label: sizeLabel,
    email,
  });

  // 23505 = unique violation: already registered. Same answer as success.
  if (error && error.code !== '23505') {
    log.error('stock_alert.insert_failed', error, { requestId, productId });
    return apiError(requestId, 'INTERNAL', 'Could not save your request. Please try again.', 500);
  }

  return apiSuccess({ registered: true });
}
