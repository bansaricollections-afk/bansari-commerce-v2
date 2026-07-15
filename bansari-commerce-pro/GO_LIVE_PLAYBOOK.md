# Bansari Commerce — Go-Live Playbook

This is the minute-by-minute procedure for the day of launch.
Assign one person to execute this. Do not multitask during the launch window.

---

## Prerequisites (Complete Day Before)

- [ ] All LAUNCH_CHECKLIST.md items completed
- [ ] Smoke test passed in full
- [ ] ₹1 real payment tested and refunded
- [ ] DNS propagated (site loads at production URL)
- [ ] All 9 Vercel env vars confirmed present
- [ ] Razorpay webhook confirmed 200 OK
- [ ] Admin email confirmed working
- [ ] Trusted tester has confirmed site works on their device

---

## Minute 0 — Go Live Declaration

**What to do:**
- [ ] Open 4 tabs:
  1. `https://bansaricollections.com` (storefront)
  2. `https://bansaricollections.com/admin` (admin panel)
  3. Vercel Dashboard → Deployments
  4. Supabase Dashboard → Logs → API
- [ ] Confirm latest Vercel deployment is green
- [ ] Confirm storefront loads with no errors
- [ ] Confirm admin panel loads
- [ ] Announce launch URL to your first audience (WhatsApp, Instagram, etc.)

**Expected state:**
- Site is live, accessible, and loading correctly
- No error banners or 500 pages
- Admin panel accessible

**Rollback condition:**
- If homepage returns 500 or fails to load → immediately check Vercel deployment logs
- If Vercel deployment is red → roll back: Vercel → Deployments → previous deployment → Promote to Production

---

## Minute 5 — First Order Readiness Check

**What to do:**
- [ ] Add 1 product to cart
- [ ] Proceed to checkout
- [ ] Confirm Razorpay modal opens (do NOT complete payment — just confirm the modal opens)
- [ ] Close modal
- [ ] Check Supabase → Logs → API for any 5xx errors
- [ ] Check browser console: no red errors

**Expected state:**
- Razorpay modal opens correctly with correct amount
- No 500 errors in Supabase logs

**Rollback condition:**
- Razorpay modal does not open → check `RAZORPAY_KEY_ID` in Vercel env vars
- 500 error on `/api/payment/create-order` → check `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`

---

## Minute 15 — Live Transaction Test

**What to do:**
- [ ] Complete a real ₹1 payment using your own card
- [ ] Confirm redirect to `/order-success`
- [ ] Confirm order number displayed on success page
- [ ] Open Supabase → Table Editor → `orders` table → confirm row exists with `payment_status = 'paid'`
- [ ] Open Razorpay Dashboard → Payments → confirm payment captured
- [ ] Open Razorpay Dashboard → Webhooks → Recent Deliveries → confirm `200 OK`
- [ ] Check your email inbox → order confirmation email received
- [ ] Open `/admin/orders` → confirm order visible
- [ ] Issue ₹1 refund from Razorpay Dashboard immediately

**Expected state:**
- Order in database with `paid` status
- Webhook delivered with 200
- Confirmation email in inbox within 60 seconds
- Order visible in admin

**Rollback condition:**
- Order not in database → check `/api/payment/verify` endpoint and Supabase function logs
- Webhook 400 → `RAZORPAY_WEBHOOK_SECRET` mismatch — correct in Vercel → Redeploy
- Email not received → check Resend Dashboard → Logs for delivery status

---

## Minute 30 — Traffic & Performance Check

**What to do:**
- [ ] Open Vercel Dashboard → Project → Analytics (if enabled)
- [ ] Check Vercel Dashboard → Project → Functions → confirm no function errors
- [ ] Open Supabase → Logs → API → filter by `status >= 500` → should be empty
- [ ] Test site on mobile (your phone, incognito)
- [ ] Test site on a different network (mobile data, not WiFi)
- [ ] Share with 2–3 trusted contacts and ask for immediate feedback

**Expected state:**
- No 5xx function errors
- Site loads on mobile in < 3 seconds on 4G
- No layout issues on mobile

**Rollback condition:**
- Sustained 5xx errors → roll back deployment immediately
- Critical UI broken on mobile → hot-fix commit or roll back

---

## Hour 1 — Stability Confirmation

**What to do:**
- [ ] Check Supabase → Logs → Auth → no unexpected errors
- [ ] Check Razorpay → Webhooks → no failed deliveries
- [ ] Confirm Resend Dashboard → Logs → all emails delivered
- [ ] Review Vercel → Functions log for any repeated errors
- [ ] Check `orders` table row count matches expected orders placed
- [ ] Check `products` table stock values are decrementing correctly

**Expected metrics:**
- 0 webhook failures
- 0 failed email deliveries
- 0 unmatched orders (every payment has a corresponding order row)

**Rollback condition:**
- Multiple customers reporting payment taken but no order created → pause Razorpay payments immediately (Razorpay Dashboard → Disable payments) → investigate → fix → re-enable

---

## Hour 6 — Business Health Review

**What to do:**
- [ ] Log in to `/admin/analytics` → review order count, revenue
- [ ] Log in to Razorpay Dashboard → review captured payments total
- [ ] Cross-check: Razorpay total = Supabase orders total (no orphaned payments)
- [ ] Review any customer emails or WhatsApp messages
- [ ] Check product stock levels — restock any items near zero
- [ ] Check Vercel → Usage → confirm within free tier or expected plan limits

**Expected metrics:**
- Razorpay captured amount = sum of `orders.total_amount` where `payment_status = 'paid'`
- No orphaned Razorpay payments without matching order rows

**Rollback condition:**
- None at this stage — issues are operational, not deployment. Handle case by case.

---

## Hour 24 — End of Day 1 Review

**What to do:**
- [ ] Full reconciliation: count orders in Supabase = count captured payments in Razorpay
- [ ] Review all Resend email logs for bounces or failures
- [ ] Check Google Search Console for crawl errors (if submitted)
- [ ] Review Vercel Analytics for top traffic sources, top pages, bounce rate
- [ ] Update product stock for any sold-out items
- [ ] Respond to all customer inquiries
- [ ] Document any issues found and create GitHub issues for v1.0.1
- [ ] Backup: export Supabase data (Dashboard → Settings → Backups)

**Expected metrics:**
- 100% webhook delivery rate
- 100% email delivery rate
- 0 orphaned payments
- Stock levels accurate

---

## Rollback Plan (Any Time)

### Instant Rollback (< 60 seconds)

1. Go to: **Vercel Dashboard → Project → Deployments**
2. Find the previous successful deployment
3. Click the three-dot menu → **"Promote to Production"**
4. Confirm. Rollback is live in < 60 seconds.

### When to Roll Back

| Condition | Action |
|---|---|---|
| Homepage returns 500 for > 2 minutes | Roll back immediately |
| Payments failing for > 2 minutes | Disable Razorpay payments + roll back |
| Admin panel inaccessible | Roll back |
| Database connection errors | Roll back + check Supabase status |
| Multiple customers report wrong charges | Pause Razorpay + roll back + investigate |

### Database Rollback

Database migrations cannot be auto-rolled back. If a migration caused issues:
1. Go to Supabase → SQL Editor
2. Run the corresponding `down` migration from `supabase/migrations/`
3. Re-deploy the previous code version via Vercel

### Do NOT Roll Back If:
- A single customer reports an issue (investigate first)
- Webhook delivery is delayed (Razorpay retries for 24 hours)
- Email is delayed (Resend has queuing)
