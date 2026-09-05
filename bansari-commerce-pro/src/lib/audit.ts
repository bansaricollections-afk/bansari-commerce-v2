import { createServiceRoleClient } from '@/lib/supabase/service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'audit' });

/**
 * Record an administrator action in `admin_audit_log`.
 *
 * WHY A SHARED HELPER
 * The catalogue routes each inline their own `.insert()` into the audit table.
 * That worked, but it meant every new route had to remember the column names,
 * and — more importantly — an audit failure could reject the whole request,
 * because an un-awaited or unguarded insert error propagates. Refunding a
 * customer must not fail because a log row could not be written.
 *
 * WHY ORDERS ESPECIALLY
 * Before this, the audit trail covered products, categories, coupons and
 * inventory, but NOT orders. Refunds, cancellations and status changes — the
 * actions that move money and the ones an attacker with a stolen admin session
 * would actually use — left no record at all. That is the gap this closes.
 *
 * NEVER THROWS. A failed audit write is logged at error level and swallowed.
 * The alternative is worse: a logging outage that blocks order operations, or
 * a caller wrapping every call in its own try/catch and getting it wrong.
 * The trade is explicit — availability of the money path beats completeness of
 * the log — and the error log is the compensating control.
 */
export async function recordAdminAction(params: {
  /** Verb, snake_case, prefixed by entity: `order_refund`, `order_cancel`. */
  action: string;
  entityType: string;
  entityId: string | number;
  /** The admin's Supabase user id, from requireAdminSession(). */
  userId: string;
  /**
   * Context worth having during an investigation: amounts, reasons, which
   * fields changed. Never put a full customer record or payment credentials
   * here — this table is readable by every admin.
   */
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = createServiceRoleClient();
    const { error } = await sb.from('admin_audit_log').insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: String(params.entityId),
      user_id: params.userId,
      metadata: params.metadata ?? {},
    });

    if (error) {
      log.error('audit.write_failed', {
        action: params.action,
        entityId: String(params.entityId),
        message: error.message,
      });
    }
  } catch (err) {
    log.error('audit.write_threw', {
      action: params.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
