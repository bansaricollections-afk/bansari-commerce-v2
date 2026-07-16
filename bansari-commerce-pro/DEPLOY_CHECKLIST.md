# Bansari Commerce Pro — Production Deployment Checklist

This checklist contains every **manual** task required before go-live.
All P0 code defects have been resolved in the repository.
These items cannot be automated through the GitHub API.

---

## STEP 1 — Apply Database Migrations

All 12 migrations exist in `supabase/migrations/` but must be pushed to the
production Supabase project.

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your production project (run from bansari-commerce-pro/)
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push

# Verify all migrations are applied
supabase db diff --linked
```

Migrations to verify are applied (in order):
1. `20260702001523_initial_schema.sql`
2. `20260706130000_orders_schema.sql`
3. `20260708140000_orders_integrity.sql`
4. `20260716010000_inventory_and_payment_constraints.sql`
5. `20260716020000_pending_orders.sql`
6. `20260716030000_pending_orders_cleanup.sql`
7. `20260716040000_rls_admin_only_products_and_storage.sql`
8. `20260716060000_order_audit_and_inventory_safety.sql`
9. `20260716070000_indexes_and_fk_hardening.sql`
10. `20260716080000_webhook_event_idempotency.sql`
11. `20260716090000_pending_orders_user_id.sql`
12. `20260716_coupons.sql`

---

## STEP 2 — Generate OG Image

The repository contains `/public/og-image-placeholder.svg` as an interim
social sharing image. Generate the production JPG before launch.

**Specification (from `public/og-image-spec.txt`):**
- Dimensions: 1200 × 630 pixels
- Format: JPG, quality 90+
- Brand colors: background `#7c3f2e`, text `#f5e6d3`

**Option A — Design tool:** Use Figma, Canva, or Photoshop per the spec.

**Option B — Node script:**
```bash
npm install sharp
node -e "
const sharp = require('sharp');
sharp('./public/og-image-placeholder.svg')
  .resize(1200, 630)
  .jpeg({ quality: 92 })
  .toFile('./public/og-image.jpg')
  .then(() => console.log('og-image.jpg created'));
"
```

**After placing `og-image.jpg` in `/public/`, update `src/app/layout.tsx`:**
- Change `openGraph.images[0].url` from `/og-image-placeholder.svg` to `/og-image.jpg`
- Change `twitter.images[0]` from `/og-image-placeholder.svg` to `/og-image.jpg`

---

## STEP 3 — Generate favicon.ico

```bash
npm install sharp
node -e "
const sharp = require('sharp');
sharp('./public/favicon.svg')
  .resize(32, 32)
  .toFile('./public/favicon.ico');
"
```

Or use https://realfavicongenerator.net — upload `favicon.svg`.

After placing in `/public/`, update `src/app/layout.tsx`:
- Change `icons.icon` from `/favicon.svg` to `/favicon.ico`
- Change `icons.shortcut` from `/favicon.svg` to `/favicon-16x16.png`

---

## STEP 4 — Generate favicon-16x16.png

```bash
node -e "
const sharp = require('sharp');
sharp('./public/favicon.svg')
  .resize(16, 16)
  .png()
  .toFile('./public/favicon-16x16.png');
"
```

---

## STEP 5 — Generate apple-touch-icon.png

```bash
node -e "
const sharp = require('sharp');
sharp('./public/favicon.svg')
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png');
"
```

After placing in `/public/`, update `src/app/layout.tsx`:
- Change `icons.apple` from `/favicon.svg` to `/apple-touch-icon.png`

---

## STEP 6 — Set Admin User Role

The admin middleware checks `user.app_metadata.role === 'admin'`.
This must be set server-side — it cannot be set from the client.

```bash
# Using Supabase CLI
supabase functions invoke set-admin-role --data '{"user_id": "YOUR_USER_UUID"}'
```

**Or via Supabase Dashboard:**
1. Go to Authentication → Users
2. Find your admin user
3. Click "Edit"
4. Set App Metadata: `{ "role": "admin" }`
5. Save

**Or via service-role API call (one-time script):**
```js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
await supabase.auth.admin.updateUserById('YOUR_USER_UUID', {
  app_metadata: { role: 'admin' },
});
```

---

## STEP 7 — Configure Razorpay Webhook

1. Log in to https://dashboard.razorpay.com
2. Go to Settings → Webhooks
3. Add webhook URL: `https://www.bansaricollection.in/api/payment/webhook`
4. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Copy the Webhook Secret and set it as `RAZORPAY_WEBHOOK_SECRET` in your
   Vercel/deployment environment variables

---

## STEP 8 — Environment Variables

Verify all environment variables are set in your deployment platform:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_SITE_URL=https://www.bansaricollection.in
RESEND_API_KEY
EMAIL_FROM=orders@bansaricollection.in
```

---

## STEP 9 — Verify Health Endpoints Post-Deploy

```bash
curl https://www.bansaricollection.in/api/health
curl https://www.bansaricollection.in/api/health/database
curl https://www.bansaricollection.in/api/health/email
curl https://www.bansaricollection.in/api/health/payments
```

All must return `{ "status": "ok" }` or equivalent.

---

## STEP 10 — Smoke Test Payment Flow

1. Add a product to cart
2. Proceed to checkout
3. Complete payment with Razorpay test card:
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
4. Verify:
   - Order confirmation page shown
   - Confirmation email received
   - Order appears in admin dashboard
   - Product stock decremented
   - `webhook_events` row created in Supabase
   - `order_audit_trail` rows created

---

## Asset Status Summary

| Asset | Status | Action Required |
|---|---|---|
| `favicon.svg` | ✅ In repo | None |
| `site.webmanifest` | ✅ In repo | None |
| `og-image-placeholder.svg` | ✅ In repo | Replace with `og-image.jpg` (Step 2) |
| `og-image.jpg` | ❌ Must generate | Step 2 |
| `favicon.ico` | ❌ Must generate | Step 3 |
| `favicon-16x16.png` | ❌ Must generate | Step 4 |
| `apple-touch-icon.png` | ❌ Must generate | Step 5 |

---

## Code Status

All P0 code defects have been resolved. This checklist contains only
infrastructure and binary asset tasks that cannot be automated through
the GitHub API.

Zero P0 code defects remain in the repository.
