# Bansari Commerce — Go-Live Playbook

> **Domain:** `https://www.bansaricollection.in`  
> **Prerequisite:** All LAUNCH_CHECKLIST.md items complete. Vercel deployment status = Ready.

---

## MINUTE 0 — Flip the Switch

**Actions:**
- Open 4 browser tabs: storefront, admin `/admin`, Supabase dashboard, Razorpay dashboard
- Navigate to `https://www.bansaricollection.in` — confirm homepage loads
- Check Vercel Functions tab — confirm 0 errors
- Announce URL to team

**Expected metrics:**
- Homepage HTTP 200
- No console errors
- Vercel Realtime: 0 function errors

**Rollback condition:** Homepage returns 500 for > 2 minutes → rollback immediately (see Rollback section)

---

## MINUTE 5 — Payment Flow

**Actions:**
- Add any product to cart
- Proceed to checkout
- Confirm Razorpay payment modal opens
- Check Supabase → Logs → confirm no 5xx errors

**Expected metrics:**
- Razorpay modal initialises without JS errors
- Supabase logs: 0 errors

**Rollback condition:** Modal fails to open → check `RAZORPAY_KEY_ID` in Vercel env vars → redeploy

---

## MINUTE 15 — Live Transaction Test

**Actions:**
- Make a real ₹1 payment with a live card
- Verify: order row appears in Supabase `orders` table with `status = paid`
- Verify: `/api/payment/webhook` received HTTP 200 in Razorpay → Webhooks → Recent Deliveries
- Verify: confirmation email received in inbox
- Verify: order appears in admin panel `/admin`
- **Issue refund immediately** from Razorpay dashboard

**Expected metrics:**
- DB row: `status = 'paid'`, correct `amount`, correct `razorpay_payment_id`
- Webhook: HTTP 200, delivery time < 5s
- Email: received within 60s

**Rollback condition:** No DB row after payment → check `/api/payment/verify` logs → rollback if not fixable in 10 min

---

## MINUTE 30 — Cross-Device Check

**Actions:**
- Open `https://www.bansaricollection.in` on mobile (different network — 4G/5G)
- Test: homepage → product page → cart → checkout flow (stop before payment)
- Check Vercel Functions for any new errors
- Share URL with 2-3 trusted contacts for independent check

**Expected metrics:**
- Mobile LCP < 3s on 4G
- Vercel Functions: 0 new errors

**Rollback condition:** Sustained 5xx errors from multiple users → rollback

---

## HOUR 1 — First Reconciliation

**Actions:**
- Razorpay: count `payment.captured` events
- Supabase: `SELECT COUNT(*) FROM orders WHERE status = 'paid'`
- Both counts must match
- Resend: confirm 0 bounced/failed email deliveries
- Razorpay: confirm 0 webhook failures

**Expected metrics:**
- Razorpay captured count = Supabase paid count
- Webhook failure rate: 0%
- Email bounce rate: 0%

**Rollback condition:** Multiple customers report wrong charge amount → pause Razorpay live key → rollback deployment immediately

---

## HOUR 6 — Admin Review

**Actions:**
- Open `/admin` → review all orders
- Check for any `status = pending` orders older than 30 min (possible webhook failure)
- Check stock levels — any product at 0 stock must be marked out-of-stock
- Cross-check: Razorpay total captured (₹) vs sum of `orders.total` in Supabase

**Expected metrics:**
- 0 stuck pending orders
- All captured payments reflected in DB
- Stock levels non-negative

**Rollback condition:** Orphaned payments (Razorpay captured, no DB row) → investigate immediately. Do not rollback yet — run corrective SQL insert. Escalate if > 2 occurrences.

---

## HOUR 24 — End of Day 1

**Actions:**
- Full payment reconciliation: export Razorpay transactions CSV + Supabase orders CSV
- Export Supabase backup: Settings → Backups → Download
- Review Vercel Analytics: bounce rate, top pages, conversion
- Review error rate: Vercel Functions → any 500s in last 24h
- Log any issues for v1.0.1 patch
- Confirm SSL certificate valid: `https://www.bansaricollection.in` shows 🔒

**Expected metrics:**
- 0 unresolved errors
- 0 payment discrepancies
- SSL: valid, expiry > 80 days

---

## ROLLBACK PROCEDURE

### Instant rollback (< 60 seconds)

1. Vercel Dashboard → Project → **Deployments**
2. Find the previous successful deployment (one row above current)
3. Click `⋯` → **Promote to Production**
4. Confirm — previous build goes live within 30s

### When to rollback
- Homepage 500 for > 2 minutes
- Payment failures for > 2 minutes
- Admin panel inaccessible
- Multiple customers report wrong charges
- Webhook endpoint returning 500 consistently

### Do NOT rollback for
- Single isolated customer issue
- Webhook delivery delay (Razorpay retries for 24h automatically)
- Email delivery delay < 5 minutes
- Single 404 on a non-critical page

### Database note
Vercel rollback does NOT rollback the database. If a migration caused the issue, run the corresponding down-migration SQL in Supabase → SQL Editor manually before or after the Vercel rollback.
