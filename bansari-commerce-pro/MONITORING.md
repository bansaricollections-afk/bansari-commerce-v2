# Bansari Commerce — Post-Launch Monitoring Checklist

Check this dashboard daily for the first week, then weekly thereafter.

---

## DAILY CHECKS (First 7 Days)

### Orders

```
[ ] Log in to /admin/orders
[ ] Count today's orders
[ ] Verify each order has payment_status = 'paid' or 'pending'
[ ] Check for any orders stuck in 'pending' > 1 hour
    Action if stuck: Check Razorpay webhook delivery for that order's razorpay_order_id
[ ] Cross-check Razorpay Dashboard captured payments = Supabase paid orders total
    SQL check:
      SELECT COUNT(*), SUM(total_amount)
      FROM orders
      WHERE payment_status = 'paid'
      AND created_at > NOW() - INTERVAL '24 hours';
```

### Payments

```
[ ] Razorpay Dashboard → Payments → filter Last 24 hours
[ ] All captured payments have matching order in Supabase
[ ] No payments in 'authorized' state > 30 minutes (should auto-capture)
[ ] No chargebacks or disputes
[ ] Refund status: any pending refunds issued?
```

### Webhook Health

```
[ ] Razorpay Dashboard → Webhooks → Recent Deliveries
[ ] All deliveries show HTTP 200
[ ] If any show 400:
    - Check RAZORPAY_WEBHOOK_SECRET in Vercel matches Razorpay Dashboard
    - Redeploy if secret was changed
[ ] If any show 5xx:
    - Check Vercel Functions log for /api/payment/webhook
    - Check Supabase logs for database errors
```

### Inventory

```
[ ] Check products with stock < 5:
    SQL:
      SELECT id, name, stock
      FROM products
      WHERE stock < 5
      ORDER BY stock ASC;
[ ] Restock or mark out-of-stock in admin panel
[ ] Verify no product has stock = negative (data integrity check):
    SQL:
      SELECT id, name, stock FROM products WHERE stock < 0;
    Expected: 0 rows
```

### Emails

```
[ ] Resend Dashboard → Logs → Last 24 hours
[ ] All order confirmation emails show 'Delivered' status
[ ] Check for any 'Bounced' or 'Failed' deliveries
    Action: If bounce rate > 5%, check EMAIL_FROM domain DNS records
[ ] Check spam rate: Resend Dashboard → Domains → Reputation
```

### Errors (4xx / 5xx)

```
[ ] Vercel Dashboard → Project → Functions → Last 24 hours
[ ] Filter by status >= 500 → should be 0
[ ] Supabase Dashboard → Logs → API → filter status >= 500
[ ] Any 404 patterns? (May indicate broken links from external sites)
    Check: Vercel Analytics → Top 404 pages
[ ] Any 401/403 spikes? (May indicate attempted unauthorised admin access)
```

### Performance

```
[ ] Vercel Dashboard → Project → Speed Insights (if enabled)
[ ] LCP (Largest Contentful Paint): target < 2.5 seconds
[ ] INP (Interaction to Next Paint): target < 200ms
[ ] CLS (Cumulative Layout Shift): target < 0.1
[ ] If any metric degrades: check if new images were added without width/height attributes
```

### Analytics

```
[ ] Vercel Analytics → Today's visitors
[ ] Top pages by traffic
[ ] Top referrers (which platform is sending traffic?)
[ ] If GA4 installed: check conversion funnel
    (Product viewed → Add to cart → Checkout started → Purchase)
[ ] Cart abandonment rate: (Checkout started - Purchases) / Checkout started
    Target: < 70% abandonment
```

---

## WEEKLY CHECKS (Ongoing)

```
[ ] Reconcile: total Razorpay settled amount = total in bank account
[ ] Review all 1-star or negative customer feedback
[ ] Check Supabase database size (Dashboard → Settings → Database → Size)
[ ] Review Vercel usage vs. plan limits
[ ] Rotate API keys if any team member has left
[ ] Check for dependency security updates: npm audit
[ ] Review top search queries in admin search logs
[ ] Restock all products with stock < 10
[ ] Archive or mark old orders as fulfiled
```

---

## ALERTS TO SET UP

Set up these manual checks as recurring calendar reminders:

| Alert | Frequency | Check |
|---|---|---|
| Webhook failures | Daily | Razorpay → Recent Deliveries → any non-200 |
| Low stock | Daily | Supabase: stock < 5 |
| Pending orders | Twice daily | Orders with payment_status = 'pending' > 1hr |
| Failed emails | Daily | Resend logs → Failed/Bounced |
| Vercel errors | Daily | Functions log → 5xx |
| Revenue reconciliation | Weekly | Razorpay settled = bank deposit |

---

## ESCALATION CONTACTS

Fill in before launch:

| Service | Support URL | Your Account Email |
|---|---|---|
| Vercel | https://vercel.com/help | |
| Supabase | https://supabase.com/support | |
| Razorpay | https://razorpay.com/support | |
| Resend | https://resend.com/help | |

---

## MONTHLY BACKUP

```
[ ] Supabase Dashboard → Settings → Backups → Download backup
[ ] Export orders CSV: /admin/orders → Export (or via SQL)
    SQL:
      COPY (SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days')
      TO '/tmp/orders_backup.csv' CSV HEADER;
[ ] Save to Google Drive or external storage
```
