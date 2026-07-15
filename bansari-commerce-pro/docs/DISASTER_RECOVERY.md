# Disaster Recovery Plan

> **Owner**: SRE / Principal Architect  
> **Last reviewed**: 2026-07-16  
> **Classification**: Internal — Restricted

---

## 1. Recovery Objectives

| Metric | Target | Notes |
|---|---|---|
| **RTO** (Recovery Time Objective) | ≤ 2 hours | From incident declaration to service restoration |
| **RPO** (Recovery Point Objective) | ≤ 24 hours | Maximum acceptable data loss |
| **MTTR** (Mean Time To Repair) | ≤ 4 hours | Average across all incident types |
| **Uptime SLA** | 99.5% monthly | ~3.6 hours downtime budget / month |

---

## 2. Incident Severity Levels

| Level | Description | Response Time | Examples |
|---|---|---|---|
| **P0** | Full service outage | Immediate (< 15 min) | DB down, payment broken, site 500 |
| **P1** | Critical feature broken | < 1 hour | Checkout broken, emails not sending |
| **P2** | Degraded performance | < 4 hours | Slow queries, high error rate |
| **P3** | Minor issue | Next business day | Admin UI bug, wrong label |

---

## 3. Rollback Procedure

### 3.1 Code Rollback (Vercel)

```bash
# List recent deployments
vercel ls --scope=<team>

# Promote previous deployment to production
vercel promote <DEPLOYMENT_URL> --scope=<team>

# Verify health after rollback
curl https://www.bansaricollection.in/api/health
```

Vercel keeps the last 100 deployments. Rollback is instant (DNS alias swap — no rebuild).

### 3.2 Database Rollback

```bash
# Option A: Restore from PITR (Supabase Dashboard)
# Dashboard > Backups > Restore to Point > Select time before incident

# Option B: Restore from manual dump
psql "$DATABASE_URL" < backup_YYYYMMDD_HHMMSS.sql

# After any DB restore, re-run migrations:
supabase db push
```

### 3.3 Migration Rollback

All migrations must have a corresponding rollback script. Store them at:
`supabase/rollbacks/<migration_name>_rollback.sql`

Example rollback:
```sql
-- Rollback: 20260716070000_indexes_and_fk_hardening
DROP INDEX IF EXISTS public.orders_payment_status_created_at_idx;
DROP INDEX IF EXISTS public.orders_order_status_created_at_idx;
-- ... (drop all indexes added in this migration)
```

---

## 4. Payment Reconciliation

### 4.1 When to Run

- After any payment system outage
- After a database restore
- Daily as part of operational hygiene

### 4.2 Procedure

```sql
-- Step 1: Find orders marked paid with no Razorpay payment ID
SELECT id, order_number, grand_total, created_at
FROM public.orders
WHERE payment_status = 'paid'
  AND (razorpay_payment_id IS NULL OR razorpay_payment_id = '')
ORDER BY created_at DESC;

-- Step 2: Find pending_orders older than 2 hours (potentially abandoned)
SELECT razorpay_order_id, created_at, grand_total_paise
FROM public.pending_orders
WHERE created_at < NOW() - INTERVAL '2 hours'
ORDER BY created_at;
```

```bash
# Step 3: For each Razorpay order ID found, verify against Razorpay API
curl -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET" \
  https://api.razorpay.com/v1/orders/<rzp_order_id>/payments

# Step 4: If payment is captured in Razorpay but not in DB, manually update:
# Call the internal verify-payment API with the payment details:
curl -X POST https://www.bansaricollection.in/api/payment/verify-payment \
  -H 'Content-Type: application/json' \
  -d '{ "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }'
```

### 4.3 Refund Reconciliation

```bash
# List all refunds from Razorpay in a date range
curl -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET" \
  "https://api.razorpay.com/v1/refunds?from=<UNIX_TS>&to=<UNIX_TS>&count=100"

# Cross-check against orders with payment_status = 'refunded'
```

---

## 5. Inventory Reconciliation

After a database restore, stock levels may be ahead of reality. Run:

```sql
-- Find products where stock does not match sum of pending + fulfilled orders
WITH sold AS (
  SELECT oi.product_id, SUM(oi.quantity) AS total_sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'paid'
    AND o.order_status NOT IN ('cancelled')
  GROUP BY oi.product_id
)
SELECT
  p.id,
  p.name,
  p.stock AS current_stock,
  COALESCE(s.total_sold, 0) AS total_sold
FROM public.products p
LEFT JOIN sold s ON s.product_id = p.id
ORDER BY p.name;
```

Manually adjust stock via the Admin Inventory page after verifying against physical stock count.

---

## 6. Incident Response Checklist

```
□ Declare incident — notify stakeholders immediately
□ Assess blast radius (how many customers affected?)
□ Enable maintenance page (Vercel > Deployments > toggle maintenance)
□ Take DB snapshot if DB is accessible
□ Identify root cause
□ Execute appropriate rollback / fix
□ Re-enable service
□ Smoke-test: GET /api/health — all "ok"
□ Smoke-test checkout flow end-to-end
□ Run payment reconciliation
□ Run inventory reconciliation if stock was affected
□ Notify customers if orders were impacted
□ Write and publish post-mortem within 48 hours
```

---

## 7. Contact & Escalation Matrix

| Role | Responsibility | Contact |
|---|---|---|
| SRE Lead | Incident commander | Internal team |
| DB Architect | Database recovery | Internal team |
| Razorpay Support | Payment disputes | https://razorpay.com/support |
| Supabase Support | DB/Storage issues | https://supabase.com/support |
| Vercel Support | Deployment / CDN | https://vercel.com/support |
| Resend Support | Email delivery | https://resend.com/support |
