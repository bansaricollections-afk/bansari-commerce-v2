import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';
import { ProductV2Service } from '@/services/product-v2.service';
import type { CreateProductV2Payload, ProductSearchFilters } from '@/types/product-v2';

const log = createLogger({ service: 'admin.products' });

// ─── GET /api/admin/products ────────────────────────────────────────────────────
// Query params (all optional):
//   q          → filters.query
//   categoryId → filters.categoryId
//   categorySlug → filters.categorySlug
//   collectionId → filters.collectionId
//   collectionSlug → filters.collectionSlug
//   featured, newArrival, bestSeller, active (booleans)
//   tags       → comma-separated string slugs
//   minPrice, maxPrice
//   page (0-based), limit (default 20)
//   orderBy    → created_at | display_order | price | name
//   ascending  → true | false
// ──────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const sp = new URL(request.url).searchParams;

  const filters: ProductSearchFilters = {};

  if (sp.get('q'))              filters.query         = sp.get('q')!;
  if (sp.get('categoryId'))     filters.categoryId    = Number(sp.get('categoryId'));
  if (sp.get('categorySlug'))   filters.categorySlug  = sp.get('categorySlug')!;
  if (sp.get('collectionId'))   filters.collectionId  = Number(sp.get('collectionId'));
  if (sp.get('collectionSlug')) filters.collectionSlug = sp.get('collectionSlug')!;
  if (sp.get('featured'))       filters.featured      = sp.get('featured') === 'true';
  if (sp.get('newArrival'))     filters.newArrival    = sp.get('newArrival') === 'true';
  if (sp.get('bestSeller'))     filters.bestSeller    = sp.get('bestSeller') === 'true';
  if (sp.get('active') !== null && sp.get('active') !== '') {
    filters.active = sp.get('active') === 'true';
  }
  if (sp.get('minPrice'))       filters.minPrice      = Number(sp.get('minPrice'));
  if (sp.get('maxPrice'))       filters.maxPrice      = Number(sp.get('maxPrice'));
  if (sp.get('tags'))           filters.tags          = sp.get('tags')!.split(',').map((t) => t.trim()).filter(Boolean);

  const page  = Math.max(0, Number(sp.get('page')  ?? 0));
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? sp.get('pageSize') ?? 20)));
  filters.page  = page;
  filters.limit = limit;

  const orderBy = sp.get('orderBy') as ProductSearchFilters['orderBy'] | null;
  if (orderBy) filters.orderBy = orderBy;

  if (sp.get('ascending') !== null && sp.get('ascending') !== '') {
    filters.ascending = sp.get('ascending') === 'true';
  }

  // sortDir=desc/asc convenience alias
  if (!filters.ascending && sp.get('sortDir')) {
    filters.ascending = sp.get('sortDir') === 'asc';
  }

  // Stock range filter (used by admin UI status filters)
  const minStock = sp.get('minStock');
  const maxStock = sp.get('maxStock');

  try {
    const result = await ProductV2Service.search({
      ...filters,
      ...(minStock !== null ? { minStock: Number(minStock) } : {}),
      ...(maxStock !== null ? { maxStock: Number(maxStock) } : {}),
    });

    log.info('admin.products.list.ok', { page, limit, total: result.total, requestId });

    // Return `data` key so the ProductManagement client (apiFetch<ApiListResponse>) can
    // read res.data. The service returns `products` — alias it here.
    return NextResponse.json({
      success: true,
      requestId,
      data: result.products,
      total: result.total,
      page: result.page,
      pageSize: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.products.list.failed', err, { requestId });
    return apiError(requestId, 'INTERNAL', message, 500);
  }
}

// ─── POST /api/admin/products ────────────────────────────────────────────────────
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

    const product = await ProductV2Service.create(payload);

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
      SKU_DUPLICATE: 409,
      SLUG_DUPLICATE: 409,
      NOT_FOUND:     404,
      INTERNAL:      500,
    };
    return apiError(requestId, code, message, statusMap[code] ?? 500);
  }
}
