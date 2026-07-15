# Production Operations Guide

> **Owner**: DevOps Lead / SRE  
> **Last reviewed**: 2026-07-16  
> **Classification**: Internal

---

## 1. Pre-Deployment Checklist

Run this before every production deployment:

```bash
# 1. Build
npm run build

# 2. TypeScript
npx tsc --noEmit

# 3. Zero console.* (search for unguarded console calls)
grep -r 'console\.' src/ --include='*.ts' --include='*.tsx' \
  | grep -v 'eslint-disable' | grep -v 'logger.ts'

# 4. Zero TODO / FIXME
grep -r 'TODO\|FIXME' src/

# 5. Zero stock_quantity references
grep -r 'stock_quantity' src/

# 6. Lint
npm run lint

# 7. Verify health endpoint locally
npm run dev & sleep 5
curl http://localhost:3000/api/health | jq .
```

All checks must pass before `git push` to main.

---

## 2. Deployment Procedure

```bash
# Vercel auto-deploys on push to main.
# For manual production deploy:
vercel --prod

# Monitor deployment:
vercel logs --follow

# After deploy — smoke test:
curl https://www.bansaricollection.in/api/health | jq .
```

Expected health response:
```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok" },
    "payments": { "status": "ok" },
    "email":    { "status": "ok" },
    "environment": { "status": "ok" }
  }
}
```

---

## 3. Database Migration Procedure

```bash
# Step 1: Take manual backup
supabase db dump --project-ref <ref> -f pre_migration_$(date +%Y%m%d).sql

# Step 2: Review migration SQL
cat supabase/migrations/<new_migration>.sql

# Step 3: Apply
supabase db push --project-ref <ref>

# Step 4: Verify
supabase db diff --project-ref <ref>  # should show no diff

# Step 5: Confirm health
curl https://www.bansaricollection.in/api/health | jq .checks.database
```

---

## 4. Environment Variable Changes

1. Update in Vercel Dashboard → Settings → Environment Variables
2. For secret rotation (Razorpay / Resend): update the key, then redeploy
3. Verify with health endpoint after every change
4. Keep `.env.production.local` encrypted backup up to date (see BACKUP_AND_RESTORE.md)

---

## 5. Monitoring & Alerting

### 5.1 Health Endpoint

```
GET /api/health
```

Monitor this URL with an uptime tool (UptimeRobot, Better Uptime, Vercel Checks):
- Alert if HTTP status ≠ 200
- Alert if `status` ≠ `"ok"`
- Alert if `checks.database.latencyMs` > 500 ms

### 5.2 Vercel Log Monitoring

All logs are structured JSON. Filter by:
- `level: "error"` — surface all application errors
- `event: "payment.*"` — payment flow events
- `event: "order.*"` — order lifecycle events

Pipe Vercel logs to Datadog / Logtail / Axiom using Vercel Log Drains.

### 5.3 Key Metrics to Watch

| Metric | Alert Threshold |
|---|---|
| Payment success rate | < 90% |
| DB query latency | > 500 ms avg |
| Low stock items | > 10 products |
| Error rate (5xx) | > 1% of requests |

---

## 6. Razorpay Webhook Recovery

If a webhook is missed (network timeout, deploy during payment):

```bash
# 1. Find the Razorpay payment in the Dashboard
# 2. Replay the webhook from Razorpay Dashboard → Webhooks → View → Retry

# OR manually verify the payment:
curl -X POST https://www.bansaricollection.in/api/payment/verify-payment \
  -H 'Content-Type: application/json' \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "<computed_signature>"
  }'
```

---

## 7. Admin Audit Log Review

```sql
-- Review all admin actions in last 24 hours
SELECT user_id, action, entity_type, entity_id, request_id, created_at
FROM public.admin_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Review all order status changes
SELECT order_id, event_type, actor, metadata, created_at
FROM public.order_audit_trail
ORDER BY created_at DESC
LIMIT 50;
```

---

## 8. Production Readiness Score Checklist

```
Infrastructure
  ✓ Vercel Pro (auto-scaling, 99.99% SLA)
  ✓ Supabase Pro (PITR, connection pooling)
  ✓ Razorpay Live mode
  ✓ Resend with verified domain
  ✓ Custom domain with SSL

Security
  ✓ All security headers (HSTS, CSP, X-Frame-Options, etc.)
  ✓ Admin routes protected server-side (getUser() JWT validation)
  ✓ RLS enabled on all tables
  ✓ Service role key never exposed to client
  ✓ Razorpay signature verified with timingSafeEqual
  ✓ Rate limiting on checkout and webhook endpoints

Data Integrity
  ✓ Inventory cannot go negative (DB constraint + RPC check)
  ✓ All FK constraints with appropriate ON DELETE/UPDATE
  ✓ Order audit trail append-only (immutable)
  ✓ Admin audit log append-only (immutable)

Observability
  ✓ Structured JSON logs (requestId, userId, route, latency, gitSHA)
  ✓ Health endpoint with all sub-checks
  ✓ Production metrics API (/api/metrics)

Business Continuity
  ✓ Backup & Restore runbook (BACKUP_AND_RESTORE.md)
  ✓ Disaster Recovery plan (DISASTER_RECOVERY.md)
  ✓ RTO ≤ 2 hours | RPO ≤ 24 hours

SEO
  ✓ robots.txt (auto-generated, disallows /admin, /api)
  ✓ sitemap.xml (auto-generated, includes all product URLs)
  ✓ Organization + WebSite + SearchAction schema
  ✓ Product + Offer + ShippingDetails + MerchantReturnPolicy schema
  ✓ BreadcrumbList schema on product pages
  ✓ FAQPage schema on FAQ page
  ✓ Canonical URLs on all pages
```
