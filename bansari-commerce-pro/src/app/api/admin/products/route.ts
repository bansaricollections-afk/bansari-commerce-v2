import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';
import type { CreateProductV2Payload, ProductSearchFilters } from '@/types/product-v2';

const log = createLogger({ service: 'admin.products' });

// ─── GET /api/admin/products ──────────────────────────────────────────────────
// Query params:
//   q, category, collection, featured, newArrival, bestSeller, active,
//   minPrice, maxPrice, minStock, maxStock, tags,
//   page (0-based), pageSize (default 20), sortBy, sortDir
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);

  const filters: ProductSearchFilters = {};
  if (searchParams.get('q'))            filters.query        = searchParams.get('q')!;
  if (searchParams.get('category'))     filters.category     = searchParams.get('category')!;
  if (searchParams.get('collection'))   filters.collection   = searchParams.get('collection')!;
  if (searchParams.get('featured'))     filters.featured     = searchParams.get('featured') === 'true';
  if (searchParams.get('newArrival'))   filters.newArrival   = searchParams.get('newArrival') === 'true';
  if (searchParams.get('bestSeller'))   filters.bestSeller   = searchParams.get('bestSeller') === 'true';
  if (searchParams.get('active') !== null && searchParams.get('active') !== '') {
    filters.active = searchParams.get('active') === 'true';
  }
  if (searchParams.get('minPrice'))     filters.minPrice     = Number(searchParams.get('minPrice'));
  if (searchParams.get('maxPrice'))     filters.maxPrice     = Number(searchParams.get('maxPrice'));
  if (searchParams.get('minStock'))     filters.minStock     = Number(searchParams.get('minStock'));
  if (searchParams.get('maxStock'))     filters.maxStock     = Number(searchParams.get('maxStock'));
  if (searchParams.get('tags'))         filters.tags         = searchParams.get('tags')!.split(',').map((t) => t.trim()).filter(Boolean);

  const page     = Math.max(0, Number(searchParams.get('page') ?? 0));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  filters.page     = page;
  filters.pageSize = pageSize;

  const sortBy  = (searchParams.get('sortBy')  ?? 'created_at') as ProductSearchFilters['sortBy'];
  const sortDir = (searchParams.get('sortDir') ?? 'desc')       as ProductSearchFilters['sortDir'];
  filters.sortBy  = sortBy;
  filters.sortDir = sortDir;

  try {
    const result = await ProductV2Service.search(filters);
    log.info('admin.products.list.ok', { page, pageSize, total: result.total, requestId });
    return NextResponse.json({ success: true, requestId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.list.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── POST /api/admin/products ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;
  const userId = (auth as { userId: string }).userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  try {
    const payload = body as CreateProductV2Payload;
    payload.created_by = userId;
    payload.updated_by = userId;

    const product = await ProductV2Service.create(payload);

    // Admin audit log
    const sb = createServiceRoleClient();
    await sb.from('admin_audit_log').insert({
      action: 'product_create',
      entity_type: 'product',
      entity_id: String(product.id),
      user_id: userId,
      metadata: { sku: product.sku, name: product.name, requestId },
    });

    log.info('admin.products.create.ok', { id: product.id, sku: product.sku, requestId });
    return NextResponse.json({ success: true, requestId, data: product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as { code?: string }).code ?? 'INTERNAL';
    log.error('admin.products.create.failed', err, { requestId });
    const statusMap: Record<string, number> = {
      VALIDATION:    422,
      DUPLICATE_SKU: 409,
      DUPLICATE_SLUG: 409,
      NOT_FOUND:     404,
      INTERNAL:      500,
    };
    return apiError(requestId, code, message, statusMap[code] ?? 500);
  }
}
