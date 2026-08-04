/**
 * /api/webhooks/razorpay
 *
 * Canonical Razorpay webhook endpoint.
 *
 * This is a thin delegate that re-uses the same handler as
 * /api/payment/webhook so both URLs are functional during migration.
 * Register THIS URL in the Razorpay Dashboard going forward.
 *
 * Both routes share identical logic, signature verification, deduplication,
 * and idempotency guarantees — the webhook_events table primary key ensures
 * an event delivered to both URLs is only processed once.
 */
export { POST } from '@/app/api/payment/webhook/route';
