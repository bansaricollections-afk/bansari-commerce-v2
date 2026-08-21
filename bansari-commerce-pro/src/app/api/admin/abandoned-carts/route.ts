import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { apiError } from '@/lib/api-response';

const log = createLogger({ service: 'admin.abandoned-carts' });

/**
 * Default abandonment window. A checkout younger than this is still plausibly
 * in progress (the Razorpay modal is open, the customer is typing an OTP), so
 * surfacing it would invite contacting someone who is mid-payment.
 */
const DEFAULT_WINDOW_MINUTES = 30;

/**
 * Upper bound is dictated by the database, not by preference:
 * cleanup_expired_pending_orders() runs hourly via pg_cron and permanently
 * deletes status='pending' rows once expires_at (created_at + 24h) passes.
 * Asking for a window wider than that can only ever return nothing.
 */
const MAX_WINDOW_MINUTES = 24 * 60;

type PendingRow = {
  id: string;
  razorpay_order_id: string | null;
  cf_order_id: string | null;
  payment_provider: string | null;
  status: string;
  grand_total: number | string | null;
  currency: string | null;
  items_json: unknown;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  user_id: string | null;
  created_at: string;
  expires_at: string | null;
};

/** Sum of line quantities, falling back to line count for older payloads. */
function itemCountOf(itemsJson: unknown): number {
  if (!Array.isArray(itemsJson)) return 0;
  const summed = itemsJson.reduce<number>((total, line) => {
    const qty = (line as { quantity?: unknown })?.quantity;
    return total + (typeof qty === 'number' && Number.isFinite(qty) ? qty : 0);
  }, 0);
  return summed > 0 ? summed : itemsJson.length;
}

// ─── GET /api/admin/abandoned-carts ──────────────────────────────────────────
// Admin-only, read-only. Never mutates pending_orders.
//
// Query params (all optional):
//   minutes → abandonment window, default 30, clamped to [1, 1440]
//   page    → 0-based (default 0)
//   limit   → default 50, clamped to [1, 100]
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  // Authorization first — nothing below runs for a non-admin. The middleware
  // in proxy.ts already gates /api/admin/*; this is the second layer.
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const sp = new URL(request.url).searchParams;

  // Number('') is 0 and Number('abc') is NaN, so both are normalised here —
  // a malformed query degrades to the default rather than erroring.
  const rawMinutes = Number(sp.get('minutes'));
  const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0
    ? Math.min(MAX_WINDOW_MINUTES, Math.floor(rawMinutes))
    : DEFAULT_WINDOW_MINUTES;

  const rawPage = Number(sp.get('page'));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 0;

  const rawLimit = Number(sp.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(100, Math.floor(rawLimit))
    : 50;

  const from = page * limit;
  const to = from + limit - 1;

  const now = Date.now();
  const cutoffIso = new Date(now - minutes * 60_000).toISOString();

  try {
    const sb = createServiceRoleClient();

    // Step 1 — candidates: checkout started, never transitioned to consumed,
    // and older than the abandonment window. Newest first.
    const { data, error, count } = await sb
      .from('pending_orders')
      // Single string literal, not a concatenation: supabase-js infers the row
      // type from the select at the type level, and splitting it degrades that
      // inference to GenericStringError[].
      .select(
        'id, razorpay_order_id, cf_order_id, payment_provider, status, grand_total, currency, items_json, customer_name, customer_email, customer_phone, user_id, created_at, expires_at',
        { count: 'exact' }
      )
      .eq('status', 'pending')
      .lte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      log.error('admin.abandoned_carts.query_failed', error);
      return apiError(requestId, 'DB_ERROR', error.message, 500);
    }

    const rows = (data ?? []) as PendingRow[];

    /*
     * Step 2 — paid-order exclusion. status='pending' alone is NOT proof that
     * a checkout went unpaid.
     *
     * orders/create transitions the row to 'consumed' with an un-awaited
     * error check, and its idempotent-replay branch returns before reaching
     * that update at all. So a genuinely paid order can be left at 'pending'.
     * Showing it here would mean chasing a customer who already bought.
     *
     * The authoritative record of payment differs by provider:
     *   Razorpay pending → orders.razorpay_order_id
     *   Cashfree pending → orders.cf_order_id
     * so the cross-check is now provider-aware. A candidate whose reference
     * matches a real order for its own provider is dropped.
     */
    const razorpayIds = rows
      .filter((r) => r.payment_provider !== 'cashfree' && r.razorpay_order_id)
      .map((r) => r.razorpay_order_id as string);
    const cashfreeIds = rows
      .filter((r) => r.payment_provider === 'cashfree' && r.cf_order_id)
      .map((r) => r.cf_order_id as string);

    const paidRazorpayIds = new Set<string>();
    const paidCashfreeIds = new Set<string>();

    if (razorpayIds.length > 0) {
      const { data: paidRows, error: paidError } = await sb
        .from('orders')
        .select('razorpay_order_id')
        .in('razorpay_order_id', razorpayIds);
      if (paidError) {
        // Fail closed: a false "abandoned" against a paying customer is worse
        // than withholding the list.
        log.error('admin.abandoned_carts.paid_crosscheck_failed', paidError);
        return apiError(requestId, 'DB_ERROR', 'Unable to verify paid orders; abandoned list withheld.', 500);
      }
      for (const o of paidRows ?? []) {
        const id = (o as { razorpay_order_id: string | null }).razorpay_order_id;
        if (typeof id === 'string') paidRazorpayIds.add(id);
      }
    }

    if (cashfreeIds.length > 0) {
      const { data: paidRows, error: paidError } = await sb
        .from('orders')
        .select('cf_order_id')
        .in('cf_order_id', cashfreeIds);
      if (paidError) {
        log.error('admin.abandoned_carts.paid_crosscheck_failed_cf', paidError);
        return apiError(requestId, 'DB_ERROR', 'Unable to verify paid orders; abandoned list withheld.', 500);
      }
      for (const o of paidRows ?? []) {
        const id = (o as { cf_order_id: string | null }).cf_order_id;
        if (typeof id === 'string') paidCashfreeIds.add(id);
      }
    }

    /** A pending row is "already paid" if its provider-specific reference matched. */
    const isPaid = (row: PendingRow): boolean =>
      row.payment_provider === 'cashfree'
        ? row.cf_order_id !== null && paidCashfreeIds.has(row.cf_order_id)
        : row.razorpay_order_id !== null && paidRazorpayIds.has(row.razorpay_order_id);

    // Step 3 — project to the minimum the admin table needs. Shipping address,
    // items_json, coupon and every payment identifier are deliberately not
    // returned; contact fields are passed through only where already captured.
    const carts = rows
      .filter((row) => !isPaid(row))
      .map((row) => {
        const createdMs = new Date(row.created_at).getTime();
        const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
        // Provider-specific reference so a Cashfree checkout shows its own id.
        const reference =
          row.payment_provider === 'cashfree' ? row.cf_order_id : row.razorpay_order_id;

        return {
          id: row.id,
          reference,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          ageMinutes: Number.isFinite(createdMs)
            ? Math.max(0, Math.round((now - createdMs) / 60_000))
            : null,
          value: Number(row.grand_total ?? 0),
          currency: row.currency ?? 'INR',
          itemCount: itemCountOf(row.items_json),
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerPhone: row.customer_phone,
          isGuest: row.user_id === null,
          // Derived, never stored. 'recovered' is intentionally not produced:
          // no code path writes it, so inventing it here would be misleading.
          state: expiresMs !== null && expiresMs < now ? 'EXPIRED' : 'ABANDONED',
        };
      });

    log.info('admin.abandoned_carts.listed', {
      requestId,
      windowMinutes: minutes,
      candidates: rows.length,
      excludedAsPaid: rows.length - carts.length,
      returned: carts.length,
    });

    return NextResponse.json({
      success: true,
      requestId,
      windowMinutes: minutes,
      page,
      limit,
      // Pre-exclusion candidate count. Paid rows are removed after the range
      // query, so `carts.length` can legitimately be smaller than `limit`.
      candidateCount: count ?? rows.length,
      excludedAsPaid: rows.length - carts.length,
      data: carts,
    });
  } catch (err) {
    log.error('admin.abandoned_carts.unhandled', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(requestId, 'INTERNAL_ERROR', message, 500);
  }
}
