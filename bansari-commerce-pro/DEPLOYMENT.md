# Deployment Guide — Bansari Commerce

> **Production URL:** `https://www.bansaricollection.in`  
> **Hosting:** Vercel  
> **Database:** Supabase  
> **Payments:** Razorpay  
> **Email:** Resend

---

## Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Supabase project created
- Razorpay account (Live keys)
- Resend account + verified domain

---

## 1. Clone & Install

```bash
git clone https://github.com/bansaricollections-afk/bansari-commerce-v2.git
cd bansari-commerce-v2/bansari-commerce-pro
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

See `ENVIRONMENT.md` for descriptions of every variable.

---

## 3. Database Migrations

Run all migration files in Supabase SQL Editor in order:

```
supabase/migrations/
  001_initial_schema.sql
  002_rls_policies.sql
  003_functions.sql
  ... (run all in numeric order)
```

---

## 4. Local Development

```bash
npm run dev
# → http://localhost:3000
```

---

## 5. Production Build (verify locally)

```bash
npm run build
npx tsc --noEmit
```

Both must complete with no errors before deploying.

---

## 6. Deploy to Vercel

### Via Vercel Dashboard (recommended)

1. Import repo at https://vercel.com/new
2. Framework: **Next.js** (auto-detected)
3. Root Directory: `bansari-commerce-pro`
4. Add all environment variables from `ENVIRONMENT.md`
5. Deploy

### Via CLI

```bash
vercel --prod
```

---

## 7. Custom Domain

1. Vercel → Project → Settings → Domains
2. Add `www.bansaricollection.in`
3. Add DNS records at your registrar:
   - `@` A → `76.76.21.21`
   - `www` CNAME → `cname.vercel-dns.com`
4. SSL provisions automatically via Let's Encrypt

---

## 8. Webhook Configuration

Razorpay → Settings → Webhooks → Add:
- URL: `https://www.bansaricollection.in/api/payment/webhook`
- Events: `payment.captured`, `payment.failed`
- Secret: add to Vercel as `RAZORPAY_WEBHOOK_SECRET`

---

## 9. Post-Deploy

See `LAUNCH_CHECKLIST.md` for the full go-live checklist.  
See `GO_LIVE_PLAYBOOK.md` for the minute-by-minute launch procedure.
