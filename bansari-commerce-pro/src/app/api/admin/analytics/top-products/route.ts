import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'admin.analytics.top-products' });

/**
 * GET /api/admin/analytics/top-products
 *
 * WHAT WAS WRONG
 * This returned raw order_items rows shaped { product_id, quantity,
 * products: { name } }, while AdminAnalytics reads product_name,
 * product_sku, quantity_sold and revenue. Every cell in the table rendered
 * blank.
 *
 * It also never aggregated. `.order('quantity').limit(10)` returns the ten
 * biggest single LINES, so one product bought three times appeared three
 * times and "top products" was really "top order lines". And revenue was not
 * computed at all — the column the component wanted did not exist anywhere.
 *
 * order_items already denormalises product_name, product_sku and line_total
 * at the moment of sale, so none of this needs a join: the figures stay
 * correct even if a product is later renamed or deleted, which is the whole
 * point of storing them on the line.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  /*
   * Cancelled orders are excluded. A cancelled sale is not a top seller, and
   * counting it would contradict the revenue figure on the same screen, which
   * already excludes them.
   */
  const { data: cancelled, error: cancelledError } = await supabase
    .from('orders')
    .select('id')
    .in('order_status', ['cancelled', 'Cancelled']);

  if (cancelledError) {
    log.error('admin.analytics.top_products.cancelled_lookup_failed', cancelledError);
    return NextResponse.json({ error: cancelledError.message }, { status: 500 });
  }

  const cancelledIds = new Set((cancelled ?? []).map((o) => o.id));

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, product_name, product_sku, quantity, line_total, order_id');

  if (error) {
    log.error('admin.analytics.top_products.failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /** Aggregate per product, keyed by product_id where present. */
  const byProduct = new Map<
    string,
    { product_name: string; product_sku: string | null; quantity_sold: number; revenue: number }
  >();

  for (const row of data ?? []) {
    if (cancelledIds.has(row.order_id as number)) continue;

    // Fall back to the name for lines whose product has since been deleted.
    const key = String(row.product_id ?? row.product_name ?? 'unknown');
    const existing = byProduct.get(key);
    const quantity = Number(row.quantity ?? 0);
    const revenue = Number(row.line_total ?? 0);

    if (existing) {
      existing.quantity_sold += quantity;
      existing.revenue += revenue;
    } else {
      byProduct.set(key, {
        product_name: (row.product_name as string) ?? 'Unknown product',
        product_sku: (row.product_sku as string) ?? null,
        quantity_sold: quantity,
        revenue,
      });
    }
  }

  const top = [...byProduct.values()]
    .sort((a, b) => b.quantity_sold - a.quantity_sold || b.revenue - a.revenue)
    .slice(0, 10);

  return NextResponse.json(top);
}
