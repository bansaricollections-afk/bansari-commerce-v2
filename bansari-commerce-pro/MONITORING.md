# Bansari Commerce — Post-Launch Monitoring

> **Domain:** `https://www.bansaricollection.in`

---

## DAILY CHECKLIST (Every business day, 9 AM)

### Orders
- [ ] Supabase → Table Editor → `orders` → filter `status = pending` and `created_at < now() - interval '30 minutes'`
  - Expected: 0 rows. Any row = potential webhook failure — investigate immediately.
- [ ] Confirm all orders from previous day have `status = paid` or `status = cancelled`

### Payments
- [ ] Razorpay Dashboard → Payments → filter yesterday's date
- [ ] Count `Captured` payments
- [ ] Run: `SELECT COUNT(*), SUM(total) FROM orders WHERE status = 'paid' AND created_at::date = CURRENT_DATE - 1`
- [ ] Razorpay count must equal Supabase count. Any mismatch = payment reconciliation issue.

### Webhooks
- [ ] Razorpay → Settings → Webhooks → `www.bansaricollection.in` webhook → Recent Deliveries
- [ ] Expected: all deliveries HTTP 200
- [ ] Any non-200 → check `/api/payment/webhook` in Vercel Functions logs

### Inventory
- [ ] Run: `SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC`
- [ ] Products with `stock = 0` must have `is_active = false`
- [ ] Restock or deactivate as needed

### Emails
- [ ] Resend → Logs → filter last 24h
- [ ] Expected: 0 bounced, 0 failed deliveries
- [ ] Any bounce → check recipient address validity

### Errors
- [ ] Vercel Dashboard → Project → Functions tab
- [ ] Expected: 0 functions with error rate > 0% in last 24h
- [ ] Any 500s → check function logs → fix or rollback

### 404s
- [ ] Vercel Analytics → filter status 404 (if Analytics enabled)
- [ ] Any 404 on product/category URLs = deleted content still linked — fix redirects

---

## WEEKLY CHECKLIST (Every Monday)

### Performance
- [ ] Vercel Speed Insights → check Core Web Vitals
  - LCP < 2.5s ✅
  - INP < 200ms ✅
  - CLS < 0.1 ✅
- [ ] Any metric failing → investigate and fix before next week

### Analytics
- [ ] Vercel Analytics → Sessions, Bounce rate, Top pages
- [ ] Funnel: homepage → product → cart → checkout → paid
- [ ] Note conversion rate. Benchmark week-over-week.

### Payment Reconciliation
- [ ] Export Razorpay settlements CSV for the week
- [ ] Export Supabase orders: `SELECT * FROM orders WHERE status = 'paid' AND created_at >= CURRENT_DATE - 7`
- [ ] Confirm settlement amount matches bank deposit

### Security
- [ ] Check Supabase → Authentication → Users for any suspicious sign-up spikes
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed in any client-side log

---

## ALERT THRESHOLDS

| Metric | Warning | Critical | Action |
|---|---|---|---|
| Pending orders > 30 min | 1 | 3 | Check webhook, manual status fix |
| Payment mismatch | Any | Any | Stop new orders, investigate |
| Webhook failure rate | > 0% | > 5% | Check endpoint, redeploy |
| Email bounce rate | > 2% | > 5% | Check DNS/SPF/DKIM, contact Resend |
| Function error rate | > 1% | > 5% | Check logs, rollback if needed |
| LCP | > 2.5s | > 4s | Image optimisation, CDN check |
| Stock at 0 but active | Any | Any | Deactivate product immediately |

---

## USEFUL SQL QUERIES

```sql
-- Orders stuck in pending
SELECT id, created_at, total, razorpay_order_id
FROM orders
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at ASC;

-- Daily revenue
SELECT DATE(created_at) AS date, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Low stock products
SELECT id, name, stock
FROM products
WHERE stock <= 5
ORDER BY stock ASC;

-- Top products by revenue
SELECT p.name, SUM(oi.quantity * oi.price) AS revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'paid'
GROUP BY p.name
ORDER BY revenue DESC
LIMIT 10;
```
