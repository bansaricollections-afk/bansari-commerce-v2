# Bansari Commerce — Environment Variables Reference

All environment variables required to run the application.

> Variables prefixed `NEXT_PUBLIC_` are embedded into the client-side JavaScript bundle.
> All other variables are server-only and must **never** be prefixed with `NEXT_PUBLIC_`.

---

## Required Variables

### Supabase

| Variable | Visibility | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | Your Supabase project URL. Format: `https://xxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client + server) | The anon/public key. Safe to expose — protected by RLS policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses RLS. Used exclusively in server-side API routes and services. Never expose to the browser. |

### Razorpay

| Variable | Visibility | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Server only | Your Razorpay API Key ID. Used to create payment orders server-side. |
| `RAZORPAY_KEY_SECRET` | **Server only** | Your Razorpay API Key Secret. Used for HMAC signature verification. Never expose. |
| `RAZORPAY_WEBHOOK_SECRET` | **Server only** | The webhook secret configured in the Razorpay Dashboard. Used to verify incoming webhook payloads via `crypto.timingSafeEqual`. |

### Email (Resend)

| Variable | Visibility | Description |
|---|---|---|
| `RESEND_API_KEY` | **Server only** | Resend API key for sending transactional emails. |
| `EMAIL_FROM` | Server only | The verified sender address. Example: `orders@bansaricollections.com` |

### Application

| Variable | Visibility | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | The full production URL. Example: `https://bansaricollections.com`. Used for `metadataBase` in SEO metadata and generating canonical URLs. |

---

## Local Development

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your development Supabase project credentials and Razorpay test keys.

Never commit `.env.local` — it is already listed in `.gitignore`.

---

## Vercel Deployment

Add all variables above in:
**Vercel Dashboard → Project → Settings → Environment Variables → Production**

For local preview deployments, also add them to **Preview** and **Development** environments.

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` — grants full database access bypassing all RLS policies. Treat like a database root password.
- `RAZORPAY_KEY_SECRET` — if leaked, an attacker can forge valid payment signatures. Rotate immediately if exposed.
- `RAZORPAY_WEBHOOK_SECRET` — if missing at runtime, the webhook handler rejects all Razorpay deliveries with HTTP 400 (fails safe, not open).
- `RESEND_API_KEY` — if leaked, an attacker can send emails from your verified domain.

---

## Variable Audit — Server/Client Boundary

The following server-only variables are confirmed to be used exclusively in:
- `src/lib/supabase/service.ts` — `SUPABASE_SERVICE_ROLE_KEY`
- `src/lib/razorpay.ts` — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `src/app/api/**` — all server-only keys

None of these variables appear in any Client Component (`"use client"` files).
This is enforced by Next.js — non-`NEXT_PUBLIC_` variables throw `undefined` if accessed in client bundles.
