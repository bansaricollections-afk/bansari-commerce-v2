# Bansari Commerce — Production Launch Checklist

> **Domain:** `https://www.bansaricollection.in`  
> **Stack:** Next.js 15 · Supabase · Razorpay · Resend · Vercel

---

## SUPABASE

**Dashboard:** https://supabase.com/dashboard

| # | Path | Action | Value | Expected Result |
|---|---|---|---|---|
| S1 | Project → SQL Editor | Run all migration files in order from `supabase/migrations/` | Each `.sql` file | `Success. No rows returned.` |
| S2 | Project → SQL Editor | Set admin role | `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data \|\| '{"role":"admin"}'::jsonb WHERE email = 'YOUR_ADMIN_EMAIL';` | `UPDATE 1` |
| S3 | Project → Authentication → URL Configuration → Site URL | Set site URL | `https://www.bansaricollection.in` | Saved |
| S4 | Project → Authentication → URL Configuration → Redirect URLs → Add URL | Add redirect | `https://www.bansaricollection.in/auth/callback` | Listed in redirect URLs |
| S5 | Project → Settings → API | Copy `anon` key and `service_role` key | — | Keys available for Vercel step |

---

## VERCEL

**Dashboard:** https://vercel.com/dashboard  
**Path:** Project → Settings → Environment Variables → Select scope: **Production**

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **No** `NEXT_PUBLIC_` — server only |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | From Razorpay → Settings → API Keys (Live) |
| `RAZORPAY_KEY_SECRET` | `...` | Server only — never expose to client |
| `RAZORPAY_WEBHOOK_SECRET` | `...` | Generated in Razorpay step R3 |
| `RESEND_API_KEY` | `re_...` | From Resend → API Keys |
| `EMAIL_FROM` | `orders@bansaricollection.in` | Must match Resend verified domain |
| `NEXT_PUBLIC_SITE_URL` | `https://www.bansaricollection.in` | No trailing slash |

**After adding all variables:**  
Deployments → Find latest deployment → `⋯` → **Redeploy**  
Expected: Build succeeds, deployment status = **Ready**

---

## RAZORPAY

**Dashboard:** https://dashboard.razorpay.com

| # | Path | Action | Value | Expected Result |
|---|---|---|---|---|
| R1 | Top-right mode toggle | Switch to **Live** mode | — | Header shows "Live" |
| R2 | Settings → API Keys → Generate Key (Live) | Generate and copy Key ID + Secret | — | Add both to Vercel |
| R3 | Settings → Webhooks → Add New Webhook | Webhook URL | `https://www.bansaricollection.in/api/payment/webhook` | Webhook created |
| R3 | (same form) → Secret | Generate secret | `openssl rand -hex 32` | Copy to Vercel `RAZORPAY_WEBHOOK_SECRET` |
| R3 | (same form) → Active Events | Enable events | ✅ `payment.captured` ✅ `payment.failed` | Both checked |
| R4 | Payments | Make real ₹1 test payment | Card: any live card | Order in DB + webhook 200 + email received → refund immediately |

---

## RESEND

**Dashboard:** https://resend.com

| # | Path | Action | Value | Expected Result |
|---|---|---|---|---|
| E1 | Domains → Add Domain | Add domain | `bansaricollection.in` | DNS records shown (MX, SPF TXT, DKIM TXT) |
| E2 | Your DNS registrar | Add all 3 records | Exact values from Resend UI | Domain shows **Verified** in Resend |
| E3 | API Keys → Create API Key | Name + domain scope | Name: `bansari-production` / Domain: `bansaricollection.in` | Key starting `re_...` → add to Vercel |
| E4 | Emails → Send test | Send test to your inbox | From: `orders@bansaricollection.in` | Email received within 60s |

---

## DNS & SSL

**Registrar:** Your domain registrar for `bansaricollection.in`  
**Vercel domain:** Project → Settings → Domains → Add `www.bansaricollection.in`

| Record | Type | Name | Value |
|---|---|---|---|
| Root | A | `@` | `76.76.21.21` (verify exact value in Vercel → Settings → Domains) |
| WWW | CNAME | `www` | `cname.vercel-dns.com` |

**SSL:** Vercel auto-provisions Let's Encrypt once DNS resolves (up to 48h for full propagation).  
**Expected:** Vercel → Settings → Domains → both `bansaricollection.in` and `www.bansaricollection.in` show ✅ Valid Configuration.

---

## FAVICON & OG IMAGE (Binary files — commit manually)

1. Open https://realfavicongenerator.net → upload `public/favicon.svg`
2. Download package → copy `favicon.ico`, `favicon-16x16.png`, `apple-touch-icon.png` → paste into `public/`
3. Design `og-image.jpg` (1200×630px, < 300KB, `.jpg`) — see `public/og-image-spec.txt`
4. Commit all three to `public/` and push

---

## GOOGLE SEARCH CONSOLE

**Dashboard:** https://search.google.com/search-console

| # | Action | Value |
|---|---|---|
| G1 | Add Property → Domain | `bansaricollection.in` |
| G2 | Verify via DNS TXT record | Add TXT record to registrar DNS as shown |
| G3 | Sitemaps → Add sitemap | `https://www.bansaricollection.in/sitemap.xml` |
| G4 | Wait 24-72h | First coverage report populates |

---

## ENVIRONMENT VARIABLE CROSS-CHECK

Before go-live, confirm `NEXT_PUBLIC_SITE_URL` is set to `https://www.bansaricollection.in` (no trailing slash) in Vercel **Production** scope. This value is used by `metadataBase`, canonical tags, sitemap, and robots.txt.
