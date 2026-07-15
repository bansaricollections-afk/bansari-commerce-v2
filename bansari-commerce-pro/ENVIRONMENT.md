# Environment Variables — Bansari Commerce

All variables must be set in Vercel → Project → Settings → Environment Variables under the **Production** scope.

---

## Supabase

| Variable | Description | Where to find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client) | Supabase → Settings → API → `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only** | Supabase → Settings → API → `service_role` key |

## Razorpay

| Variable | Description | Where to find |
|---|---|---|
| `RAZORPAY_KEY_ID` | Live key ID (`rzp_live_...`) | Razorpay → Settings → API Keys → Live |
| `RAZORPAY_KEY_SECRET` | Live key secret — **server only** | Razorpay → Settings → API Keys → Live |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret | Generated when creating webhook in Razorpay |

## Resend

| Variable | Description | Where to find |
|---|---|---|
| `RESEND_API_KEY` | API key (`re_...`) | Resend → API Keys |
| `EMAIL_FROM` | Sender address | `orders@bansaricollection.in` — must match Resend verified domain |

## Application

| Variable | Description | Value |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL — **no trailing slash** | `https://www.bansaricollection.in` |

---

## .env.local template

See `.env.example` in the repository root for a ready-to-copy template.

---

## Security notes

- Variables WITHOUT `NEXT_PUBLIC_` prefix are **server-only** and never sent to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` must **never** have the `NEXT_PUBLIC_` prefix.
- Rotate all keys if they are ever accidentally committed to git or exposed in logs.
