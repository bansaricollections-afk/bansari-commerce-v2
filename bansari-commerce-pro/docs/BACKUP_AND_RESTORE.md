# Backup & Restore Runbook

> **Owner**: SRE / DevOps Lead  
> **Last reviewed**: 2026-07-16  
> **Classification**: Internal — Restricted

---

## 1. Supabase Database

### 1.1 Automated Backups

Supabase Pro and above takes **daily PITR (Point-in-Time Recovery) snapshots** retained for 7 days by default (30 days on Enterprise). No action is required for daily backups.

| Setting | Value |
|---|---|
| Backup frequency | Daily (automated) |
| Retention | 7 days (Pro) / 30 days (Enterprise) |
| PITR granularity | 1 second |
| Location | Supabase-managed S3 (same region as project) |

### 1.2 Manual Snapshot Before Migrations

Always take a manual snapshot **before** running a destructive migration:

```bash
# Via Supabase CLI
supabase db dump --project-ref <ref> -f backup_$(date +%Y%m%d_%H%M%S).sql

# Via pg_dump directly (requires DB password from Dashboard > Settings > Database)
pg_dump \
  "postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres" \
  --no-owner --no-acl \
  -f backup_$(date +%Y%m%d_%H%M%S).sql
```

Store the dump in a private S3 bucket or encrypted local store — **never commit to Git**.

### 1.3 Restore Procedure

```bash
# 1. Create a new Supabase project (or use the same one for PITR)
# 2. Restore via Supabase Dashboard: Project > Backups > Restore to Point

# OR restore manually:
psql \
  "postgresql://postgres:<PASSWORD>@db.<NEW_REF>.supabase.co:5432/postgres" \
  < backup_YYYYMMDD_HHMMSS.sql

# 3. Re-run all migrations to ensure schema is current:
supabase db push --project-ref <NEW_REF>

# 4. Update NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel
```

### 1.4 Verify Restore

```sql
-- Run in Supabase SQL editor after restore
SELECT COUNT(*) FROM public.orders;
SELECT COUNT(*) FROM public.products;
SELECT COUNT(*) FROM public.order_items;
SELECT MAX(created_at) FROM public.orders; -- check most recent order is present
```

---

## 2. Supabase Storage (Product Images)

### 2.1 Current Bucket

| Bucket | Visibility | Max file size |
|---|---|---|
| `product-images` | Public | 10 MB |

### 2.2 Backup

Storage buckets are **not** included in Supabase's database PITR. Back up separately:

```bash
# Install supabase CLI and login
supabase login

# List all objects
supabase storage ls --project-ref <ref> product-images

# Download all product images (use AWS CLI against the underlying S3 endpoint)
# Retrieve the S3 credentials from Supabase Dashboard > Storage > S3 Connection
aws s3 sync \
  s3://<supabase-bucket>/product-images \
  ./backup/product-images/ \
  --endpoint-url https://<ref>.supabase.co/storage/v1/s3 \
  --region ap-south-1
```

Schedule this weekly via a cron job or GitHub Actions.

### 2.3 Restore Storage

```bash
# Upload the local backup to a new Supabase storage bucket
aws s3 sync \
  ./backup/product-images/ \
  s3://<new-ref>/product-images \
  --endpoint-url https://<NEW_REF>.supabase.co/storage/v1/s3
```

After restore, verify product image URLs in the database point to the correct bucket.

---

## 3. Environment Variables

### 3.1 Full variable list (all must be present in Vercel)

| Variable | Source | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API | **Secret** |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard > Settings > API Keys | **Secret** |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard > Settings > API Keys | **Secret** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID | Public |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard > Webhooks | **Secret** |
| `RESEND_API_KEY` | Resend Dashboard > API Keys | **Secret** |
| `EMAIL_FROM` | e.g. `orders@bansaricollection.in` | Config |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://www.bansaricollection.in` | Public |

### 3.2 Backup procedure

1. Export from Vercel CLI: `vercel env pull .env.production.local`
2. Encrypt the file: `gpg --symmetric .env.production.local`
3. Store the encrypted file in 1Password or AWS Secrets Manager.
4. **Delete the plaintext file immediately after encrypting.**

### 3.3 Restore procedure

```bash
# Decrypt
gpg --decrypt .env.production.local.gpg > .env.production.local

# Push to a new Vercel project
vercel env add < .env.production.local
```

---

## 4. Razorpay Keys

| Situation | Action |
|---|---|
| Keys compromised | Immediately rotate in Razorpay Dashboard → Update RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in Vercel → Redeploy |
| Webhook secret compromised | Rotate in Razorpay Dashboard → Update RAZORPAY_WEBHOOK_SECRET in Vercel → Redeploy |
| Account suspended | Contact Razorpay support; use backup payment provider if available |

**After rotating keys, run:**
```bash
curl https://www.bansaricollection.in/api/health | jq .checks.payments
```
Expect `{ "status": "ok" }`.

---

## 5. Resend (Email)

| Situation | Action |
|---|---|
| API key compromised | Rotate in Resend Dashboard → Update RESEND_API_KEY in Vercel → Redeploy |
| Domain verification lost | Re-verify domain DNS records in Resend Dashboard |
| Deliverability issues | Check Resend logs → Review SPF/DKIM/DMARC DNS records |

**After rotating, run:**
```bash
curl https://www.bansaricollection.in/api/health | jq .checks.email
```

---

## 6. Recovery Steps (Quick Reference)

```
1. Incident detected
2. Assess scope (DB / Storage / Keys / Code)
3. Take manual DB snapshot if DB is accessible
4. Execute relevant restore procedure above
5. Update environment variables in Vercel if needed
6. Redeploy: vercel --prod
7. Smoke-test: GET /api/health — all checks must be "ok"
8. Verify checkout flow end-to-end
9. Post incident report within 24 hours
```
