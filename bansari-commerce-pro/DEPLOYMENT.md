# Bansari Commerce — Production Deployment Guide

> **Role:** This document is for the business owner and DevOps team.
> It lists every manual step required to take the application from code-complete to live.
> All code is already production-ready. Only the steps below remain.

---

## Prerequisites

- Vercel account with the repository connected
- Supabase project created (production project, NOT the dev project)
- Razorpay account with live keys
- Resend account with a verified sending domain
- Custom domain (e.g., `bansaricollections.com`) with DNS access

---

## Step 1 — Supabase Setup

### 1a. Run database migrations (in order)

Go to: **Supabase Dashboard → SQL Editor**

Run each file in `supabase/migrations/` in chronological filename order.
The critical migrations for launch are:

```sql
-- Must exist for order creation to work:
CREATE OR REPLACE FUNCTION create_order_with_items(...) ...
CREATE OR REPLACE FUNCTION decrement_product_stock(...) ...
```

If these functions do not exist, `POST /api/orders/create` will fail at runtime.

### 1b. Set admin role on your admin account

Replace `your-admin@email.com` with your actual admin email address:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
WHERE email = 'your-admin@email.com';
```

Verify it worked:

```sql
SELECT email, raw_app_meta_data
FROM auth.users
WHERE email = 'your-admin@email.com';
```

Expected result: `raw_app_meta_data` contains `{"role": "admin"}`.

Without this step, the admin dashboard will redirect to the homepage with a `forbidden` error even after login.

### 1c. Configure Supabase Auth (production)

- **Site URL:** Set to your production domain, e.g., `https://bansaricollections.com`
- **Redirect URLs:** Add `https://bansaricollections.com/auth/callback`
- **Email templates:** Customise the confirmation and password reset emails with your brand

---

## Step 2 — Vercel Environment Variables

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add ALL of the following for the **Production** environment:

| Variable | Description | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only service role key | Supabase → Project Settings → API |
| `RAZORPAY_KEY_ID` | Razorpay live key ID | Razorpay Dashboard → Account → API Keys |
| `RAZORPAY_KEY_SECRET` | **Secret.** Razorpay live key secret | Razorpay Dashboard → Account → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | **Secret.** Webhook secret you set in Razorpay | See Step 3 below |
| `RESEND_API_KEY` | **Secret.** Resend API key | Resend Dashboard → API Keys |
| `EMAIL_FROM` | Verified sending address | e.g., `orders@bansaricollections.com` |
| `NEXT_PUBLIC_SITE_URL` | Full production URL | e.g., `https://bansaricollections.com` |

> **Security rules:**
> - `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY` must NEVER be prefixed with `NEXT_PUBLIC_`.
> - These keys never reach the browser — verified by server-side-only usage in the codebase.

---

## Step 3 — Razorpay Webhook Configuration

Go to: **Razorpay Dashboard → Webhooks → Add New Webhook**

- **Webhook URL:** `https://bansaricollections.com/api/payment/webhook`
- **Secret:** Create a strong random secret (e.g., use `openssl rand -hex 32`)
- **Events to subscribe:**
  - ✅ `payment.captured`
  - ✅ `payment.failed`

Copy the secret you just created into Vercel as `RAZORPAY_WEBHOOK_SECRET`.

> Without this, Razorpay can never notify the application of payment outcomes.
> The webhook handler validates HMAC signatures using `crypto.timingSafeEqual` —
> it will reject every delivery if this secret is missing or wrong.

---

## Step 4 — Resend Email Configuration

1. Go to **Resend Dashboard → Domains → Add Domain**
2. Add `bansaricollections.com` (or your sending subdomain, e.g., `mail.bansaricollections.com`)
3. Add the DNS records Resend provides (MX, SPF, DKIM)
4. Wait for domain verification (usually < 15 minutes)
5. Set `EMAIL_FROM` in Vercel to a verified address from that domain

---

## Step 5 — Public Assets (Design Required)

The following files must be added to `bansari-commerce-pro/public/` and committed:

| File | Dimensions | Format | Notes |
|---|---|---|---|
| `favicon.ico` | 32×32 px | ICO (multi-size) | Browser tab icon |
| `favicon-16x16.png` | 16×16 px | PNG | Referenced in `<link rel="shortcut icon">` |
| `apple-touch-icon.png` | 180×180 px | PNG | iOS home screen icon |
| `og-image.jpg` | 1200×630 px | JPEG (< 300 KB) | Social share preview image |

The `public/favicon.svg` already committed serves as a vector fallback for modern browsers.
The `public/site.webmanifest` is already committed.

For `og-image.jpg`: use a lifestyle image of your products on a clean background.
Text overlay: **"Bansari Collections — Indian Ethnic Wear"**

---

## Step 6 — Domain & DNS

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Add your domain: `bansaricollections.com` and `www.bansaricollections.com`
3. Add the DNS records Vercel provides to your domain registrar
4. SSL is automatic via Vercel — no manual certificate needed
5. Vercel automatically redirects `www` → apex (or vice versa) once both are added

---

## Step 7 — Post-Launch Analytics & Tracking

### Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → Domain → enter `bansaricollections.com`
3. Verify via DNS TXT record at your registrar
4. Submit sitemap: `https://bansaricollections.com/sitemap.xml`

### Google Analytics (GA4)
1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Add the Measurement ID to your Next.js layout or via Vercel's Analytics integration
3. Alternatively: enable **Vercel Analytics** from the project dashboard (no code change needed)

### Meta Pixel
1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Create a Pixel → install the base code in `src/app/layout.tsx`
3. Add standard events: `ViewContent` (product page), `AddToCart`, `InitiateCheckout`, `Purchase`

---

## Step 8 — Final Pre-Launch Verification

Before announcing launch, run the smoke test in `SMOKE_TEST.md`.

---

## Rollback Plan

If a critical issue is found after launch:

1. In Vercel: **Deployments → Previous deployment → Promote to Production** (instant rollback)
2. In Supabase: migration rollbacks must be run manually via SQL Editor using the `down` scripts in `supabase/migrations/`
3. In Razorpay: disable the webhook to stop payment events until the fix is deployed
