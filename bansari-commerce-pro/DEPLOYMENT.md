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

Then enable the deploy gate — **once per clone**, from the repository root:

```bash
git config core.hooksPath .githooks
```

---

## 1a. Deployment invariant (read before every deploy)

> **Production may only be deployed from a committed, clean, verified Git state.**
> Production is deployed from the committed repository state — never from
> uncommitted local changes. If the working tree is dirty: stop, do not deploy,
> and do not assume the changes were meant to ship.

Both production paths are guarded, and both fail closed:

| Path | Trigger | Guard |
|---|---|---|
| Vercel GitHub integration | `git push origin main` | `.githooks/pre-push` |
| Vercel CLI | `npm run deploy` | `scripts/deploy-preflight.sh` (npm `predeploy`) |

Required before any production deploy:

```
git status --short   = clean
HEAD                == origin/main
npx tsc --noEmit      PASS
npm run build         PASS
git diff --check      PASS
```



Pushing `main` triggers a Vercel production build **from the committed tree**.
Anything left uncommitted is simply absent from that build.

On 2026-08-12 two days of storefront work existed only as working-tree
changes. The first git-triggered deploy built the older committed homepage and
replaced the running version — hardcoded taxonomy and stock imagery came back.
Nothing was lost; it had never been committed.

`.githooks/pre-push` now blocks a push to `main` when the working tree has
uncommitted changes to tracked files, or untracked files under `src/`,
`supabase/migrations/` or `public/`. It prints exactly what would be missing.

Rule: **what is in the commit is what ships.** Deliberately shipping without
pending work requires `git push --no-verify`.

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
npm run deploy
```

Not `vercel --prod` directly. `npm run deploy` runs `scripts/deploy-preflight.sh`
first (npm `predeploy`) and aborts the deploy unless every gate passes:

```
working tree clean  →  HEAD == origin/main  →  tsc  →  build  →  diff check  →  vercel --prod
```

`vercel --prod` on its own uploads the **local working tree**, bypassing Git
entirely — that is how a deploy can diverge from the repository. The preflight
is what closes that path; it fails closed and never commits, stashes or
discards anything, it only reports what is blocking.

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
