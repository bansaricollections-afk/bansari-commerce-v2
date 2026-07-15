# Bansari Commerce — Launch Checklist

Version: v1.0.0  
Date: July 2026  
Status: Pre-launch

> Complete every item in order. Do not skip ahead.
> Items marked 🔴 are hard blockers — the site will not work without them.
> Items marked 🟡 affect SEO or brand perception only.

---

## BLOCK 1 — SUPABASE

### 1.1 Run Database Migrations 🔴

- **Dashboard:** https://supabase.com/dashboard
- **Path:** Project → SQL Editor → New Query
- **Action:** Paste and run each file from `supabase/migrations/` in ascending filename order
- **Success:** Each query returns `Success. No rows returned.` with no errors
- **Verify:**
  ```sql
  SELECT routine_name FROM information_schema.routines
  WHERE routine_type = 'FUNCTION' AND routine_schema = 'public'
  ORDER BY routine_name;
  ```
  Expected: `create_order_with_items`, `decrement_product_stock` in results

### 1.2 Set Admin Role 🔴

- **Dashboard:** https://supabase.com/dashboard
- **Path:** Project → SQL Editor → New Query
- **Value to enter:**
  ```sql
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  WHERE email = 'YOUR_ADMIN_EMAIL_HERE';
  ```
  Replace `YOUR_ADMIN_EMAIL_HERE` with your actual admin email address.
- **Success:** `1 row affected`
- **Verify:**
  ```sql
  SELECT email, raw_app_meta_data
  FROM auth.users
  WHERE email = 'YOUR_ADMIN_EMAIL_HERE';
  ```
  Expected: `raw_app_meta_data` contains `{"role": "admin"}`

### 1.3 Configure Auth Settings 🔴

- **Dashboard:** https://supabase.com/dashboard
- **Path:** Project → Authentication → URL Configuration
- **Site URL:** `https://bansaricollections.com`
- **Redirect URLs:** Click "Add URL" → enter `https://bansaricollections.com/auth/callback`
- **Success:** Settings saved banner appears

### 1.4 Enable Email Auth 🔴

- **Dashboard:** https://supabase.com/dashboard
- **Path:** Project → Authentication → Providers → Email
- **Confirm enabled:** Toggle is ON
- **Confirm email confirmations:** Enabled (users must verify email)
- **Success:** Provider card shows "Enabled"

---

## BLOCK 2 — VERCEL ENVIRONMENT VARIABLES

🔴 **All 9 variables must be set before the first production deployment.**

- **Dashboard:** https://vercel.com/dashboard
- **Path:** Project → Settings → Environment Variables
- **Environment:** Select "Production" for every variable below

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | From Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | From Supabase → Project Settings → API. **Never add NEXT_PUBLIC_ prefix.** |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | From Razorpay → Settings → API Keys. Use LIVE key, not test. |
| `RAZORPAY_KEY_SECRET` | `...` | From Razorpay → Settings → API Keys. **Server-only.** |
| `RAZORPAY_WEBHOOK_SECRET` | `...` | Created in Block 3. Enter after completing Block 3. |
| `RESEND_API_KEY` | `re_...` | From Resend → API Keys → Create API Key |
| `EMAIL_FROM` | `orders@bansaricollections.com` | Must be a verified sender on your Resend domain |
| `NEXT_PUBLIC_SITE_URL` | `https://bansaricollections.com` | No trailing slash |

- **After adding all variables:** Vercel → Deployments → Redeploy latest deployment
- **Success:** Deployment completes with green checkmark

---

## BLOCK 3 — RAZORPAY

### 3.1 Switch to Live Mode 🔴

- **Dashboard:** https://dashboard.razorpay.com
- **Path:** Top-right toggle → Switch to "Live" mode
- **Success:** Dashboard header shows "Live" label

### 3.2 Get Live API Keys 🔴

- **Dashboard:** https://dashboard.razorpay.com
- **Path:** Settings → API Keys → Generate Key (Live)
- **Action:** Download the Key ID and Key Secret
- **Enter in Vercel:**
  - `RAZORPAY_KEY_ID` = value starting with `rzp_live_`
  - `RAZORPAY_KEY_SECRET` = the secret value
- **Success:** Keys generated and saved in Vercel

### 3.3 Configure Webhook 🔴

- **Dashboard:** https://dashboard.razorpay.com
- **Path:** Settings → Webhooks → Add New Webhook
- **Webhook URL:** `https://bansaricollections.com/api/payment/webhook`
- **Secret:** Generate a strong secret:
  ```
  Use: https://www.random.org/strings/?num=1&len=64&digits=on&loweralpha=on&upperalpha=on
  Or run locally: openssl rand -hex 32
  ```
  Copy this secret → save it in Vercel as `RAZORPAY_WEBHOOK_SECRET`
- **Active Events:** Check both:
  - ✅ `payment.captured`
  - ✅ `payment.failed`
- **Success:** Webhook appears in list with status "Active"
- **Verify:** After first test payment, Razorpay → Webhooks → Recent Deliveries → status = `200`

### 3.4 Verify Live Payment Flow 🔴

- Make a real payment of ₹1 with your own card to confirm the full flow works in production
- Verify the order appears in Supabase and admin panel
- Issue a refund from Razorpay Dashboard immediately after

---

## BLOCK 4 — RESEND EMAIL

### 4.1 Add Sending Domain 🔴

- **Dashboard:** https://resend.com/domains
- **Path:** Domains → Add Domain
- **Domain to add:** `bansaricollections.com`
  (Or a subdomain: `mail.bansaricollections.com`)
- **Action:** Resend will show 3 DNS records to add (MX, SPF TXT, DKIM TXT)
- **Success:** Domain status shows "Verified" (usually < 15 minutes after DNS records are added)

### 4.2 Add DNS Records at Registrar

- **Go to your domain registrar** (GoDaddy / Namecheap / Google Domains / etc.)
- **Path:** DNS Management → Add Record
- Add all 3 records Resend provides exactly as shown
- **Success:** Resend domain dashboard shows green checkmarks on all 3 records

### 4.3 Create API Key 🔴

- **Dashboard:** https://resend.com/api-keys
- **Path:** API Keys → Create API Key
- **Name:** `bansari-commerce-production`
- **Permission:** Sending access
- **Domain:** Select `bansaricollections.com`
- **Copy the key** → enter in Vercel as `RESEND_API_KEY`
- **Success:** Key created and saved in Vercel

---

## BLOCK 5 — DOMAIN & DNS

### 5.1 Add Domain to Vercel 🔴

- **Dashboard:** https://vercel.com/dashboard
- **Path:** Project → Settings → Domains → Add
- **Add:** `bansaricollections.com`
- **Add:** `www.bansaricollections.com`
- **Action:** Vercel will show DNS records to add
- **Success:** Both domains show green "Valid Configuration" status

### 5.2 Update DNS at Registrar

- **Go to your domain registrar** DNS settings
- **Add A record:** `@` → `76.76.21.21` (Vercel's IP — use the value Vercel shows you)
- **Add CNAME:** `www` → `cname.vercel-dns.com`
- **Propagation:** 5–60 minutes typically; up to 24 hours maximum
- **Success:** `https://bansaricollections.com` loads the store

### 5.3 SSL Certificate

- **Automatic.** Vercel provisions SSL via Let's Encrypt once DNS propagates.
- **Verify:** Browser shows padlock icon on `https://bansaricollections.com`
- **Success:** No SSL warning; `https://` works

---

## BLOCK 6 — GOOGLE SEARCH CONSOLE 🟡

- **Dashboard:** https://search.google.com/search-console
- **Path:** Add Property → Domain → enter `bansaricollections.com`
- **Verify:** Add TXT record at registrar DNS → click Verify
- **Submit sitemap:** Sitemaps → Add sitemap → `https://bansaricollections.com/sitemap.xml`
- **Success:** Sitemap shows "Success" status within 24–48 hours

---

## BLOCK 7 — FINAL CHECKS BEFORE ANNOUNCE

- [ ] Run full `SMOKE_TEST.md` in incognito browser
- [ ] Test payment success with real ₹1 charge then refund
- [ ] Confirm order confirmation email arrives in inbox (not spam)
- [ ] Confirm order appears in `/admin/orders`
- [ ] Confirm stock decremented in Supabase
- [ ] Confirm Razorpay webhook shows HTTP 200
- [ ] Share link with 1 trusted person to verify on their device

---

## BLOCK 8 — POST-LAUNCH (First 24 Hours) 🟡

- [ ] Enable Vercel Analytics: Vercel Dashboard → Project → Analytics → Enable
- [ ] Submit to Google: Search Console → URL Inspection → Request Indexing for homepage
- [ ] Add Google Analytics GA4 Measurement ID (optional but recommended)
- [ ] Enable Vercel Speed Insights: Dashboard → Project → Speed Insights → Enable
