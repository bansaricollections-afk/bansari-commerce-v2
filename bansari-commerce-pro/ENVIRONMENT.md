# Environment Variables — Bansari Commerce

This document is the authoritative reference for every environment variable
required to run Bansari Commerce in production. All variables must be present
in Vercel before the first production deployment.

---

## Quick Start (Local Development)

```bash
cp .env.example .env.local
# Fill in every value in .env.local before running `npm run dev`
```

---

## Variable Reference

| Variable | Required | Exposed to browser | Where to find it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅ | ✅ | Razorpay → Settings → API Keys |
| `RAZORPAY_KEY_ID` | ✅ | ❌ | Razorpay → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | ✅ | ❌ | Razorpay → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | ❌ | Razorpay → Webhooks → your endpoint |
| `RESEND_API_KEY` | ✅ | ❌ | Resend → API Keys |
| `RESEND_FROM_EMAIL` | ✅ | ❌ | Must be a verified Resend domain |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | Your production domain, no trailing slash |

---

## Critical Security Rules

- Variables **without** `NEXT_PUBLIC_` prefix are **server-only**. They are
  never included in the browser bundle by Next.js.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security. It must only
  ever appear in server-side API routes.
- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are distinct secrets
  used for different verification operations. Do not confuse them.
- Never commit `.env.local` or any file containing real values to git.
  `.env.example` (no real values) is the only env file tracked in the repo.

---

## Vercel Deployment Setup

### Step 1 — Add environment variables

1. Open **Vercel Dashboard → your project → Settings → Environment Variables**.
2. Add every variable from the table above.
3. For each variable, select the correct environments:
   - **Production**: all variables
   - **Preview**: all variables (use test/sandbox keys for Razorpay and Resend)
   - **Development**: optional (use `.env.local` locally instead)

### Step 2 — Supabase configuration

1. Apply all migrations to your production Supabase project:
   ```bash
   supabase db push --db-url "$SUPABASE_DB_URL"
   ```
   Or paste each file from `supabase/migrations/` into the Supabase SQL Editor
   **in filename order** (timestamps are the sort key).

2. Verify the following exist in your production DB after migration:
   - Tables: `products`, `orders`, `order_items`, `pending_orders`, `coupons`
   - RPCs: `create_order_with_items`, `decrement_product_stock`,
     `cleanup_expired_pending_orders`, `set_updated_at`
   - Indexes: `orders_razorpay_payment_id_udx` (UNIQUE partial),
     `pending_orders_razorpay_order_id_udx` (UNIQUE)
   - Storage bucket: `product-images` (public)

3. Grant admin role to your admin user:
   ```
   Supabase Dashboard → Authentication → Users → [user] → Edit → app_metadata:
   { "role": "admin" }
   ```

### Step 3 — Razorpay webhook

1. In Razorpay Dashboard → Webhooks, create a new endpoint:
   - URL: `https://your-domain.com/api/webhook`
   - Events: `payment.captured`, `payment.failed`
   - Copy the **Webhook Secret** and set it as `RAZORPAY_WEBHOOK_SECRET`.

2. In production, switch from test API keys to live keys:
   - Replace `rzp_test_*` with `rzp_live_*` in Vercel env vars.

### Step 4 — Resend domain verification

1. Add and verify your sending domain in Resend Dashboard.
2. Set `RESEND_FROM_EMAIL` to a verified address on that domain
   (e.g. `orders@bansaricollections.com`).

### Step 5 — Verify health endpoints after deploy

```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/database
curl https://your-domain.com/api/health/payments
curl https://your-domain.com/api/health/email
```

All four must return `{ "status": "healthy" }` (HTTP 200) before accepting
real payments.

---

## pg_cron (Supabase Pro / Team plans)

The `cleanup_expired_pending_orders()` function is scheduled automatically
via `pg_cron` by migration `20260716030000`. If your Supabase plan does not
include pg_cron, run cleanup manually:

```sql
select public.cleanup_expired_pending_orders();
```

Or schedule it via an external cron (Vercel Cron Jobs, GitHub Actions, etc.)
that calls the Supabase RPC through the service-role client.

---

## Favicon / PWA Icons

See `public/FAVICON_INSTRUCTIONS.md` for how to generate the required binary
assets (`favicon.ico`, `favicon-16x16.png`, `apple-touch-icon.png`) from the
existing `public/favicon.svg` source file.
