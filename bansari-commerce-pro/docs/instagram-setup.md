# Connecting Instagram

One-time setup, about 20–30 minutes. Until it is done, `/admin/instagram`
still works for composing and previewing — only **Publish** is disabled.

You are building an app that posts to **your own** account, so it can stay in
development mode. There is **no App Review queue to wait in**.

---

## 1. Instagram must be a Business or Creator account

In the Instagram app: **Settings → Account type and tools → Switch to
professional account**. Choose **Business**.

A personal account cannot publish through the API under any circumstances.
This is the single most common reason the setup fails, and it fails with an
unhelpful permissions error rather than saying so.

Confirm the handle here matches `src/config/brand.ts` — currently
`bansari_collections`.

## 2. Create a Meta app

1. Go to <https://developers.facebook.com/apps> → **Create app**
2. Use case: **Other** → Type: **Business**
3. Name it something identifiable, e.g. `Bansari Commerce`

## 3. Add the Instagram product

In the app dashboard: **Add product → Instagram → Set up**, then choose
**API setup with Instagram login**.

Under **1. Generate access tokens**, click **Add account** and log in with the
Instagram account from step 1.

Grant these scopes:

- `instagram_business_basic`
- `instagram_business_content_publish`

## 4. Copy the two values

The same panel shows both:

| Value | Where | Goes to |
|---|---|---|
| Instagram account ID (a long number) | next to the connected account | `IG_USER_ID` |
| Access token | **Generate token** | `IG_ACCESS_TOKEN` |

## 5. Add them to Vercel

**Project → Settings → Environment Variables**, for **Production** and
**Preview**:

```
IG_USER_ID=<the numeric id>
IG_ACCESS_TOKEN=<the token>
```

> **Do not mark these as Sensitive.** Vercel withholds Sensitive variables at
> build time, so the value silently becomes `undefined` — a failure mode this
> project has already lost hours to once.

Redeploy for the variables to take effect. `/admin/instagram` should then show
**Connected as @yourhandle** with the remaining 24-hour quota.

---

## Tokens expire

The generated token is long-lived but **expires after 60 days**, and it
refreshes only while it is being used. Practically: if you post at least once
every two months it keeps working; if you stop for a quarter, repeat steps 3–5.

An expired token shows in the admin as "not connected" rather than as an
error, and Publish disables itself. Nothing posts half-finished.

---

## Optional overrides

| Variable | Default | When to change |
|---|---|---|
| `IG_API_VERSION` | `v26.0` | Meta retires each version after ~2 years |
| `IG_API_BASE` | `https://graph.instagram.com` | Set to `https://graph.facebook.com` if you use the Facebook Login path with a Page token instead |

---

## What happens to your photographs

Instagram only accepts images between **4:5** and **1.91:1**. Measured against
the live catalogue, most of this shop's photography is outside that:

| Source ratio | Share of catalogue | Instagram |
|---|---|---|
| 0.80 (4:5) | ~40% | accepted as-is |
| 0.75 (3:4) | ~13% | rejected |
| 0.667 (2:3) | ~47% | rejected |

So every image is fitted into a 4:5 frame on cream (`#FFFDF9`, the site's own
paper colour) **without cropping**. Nothing is cut off: a 2:3 photo gets cream
above and below.

The alternative — cropping to fill — would remove roughly a quarter of the
height of a full-length shot, which is the hem, the feet, or the fall of a
dupatta. Nothing in the image tells software which end is safe to cut, and the
result is published permanently.

Renditions are written to `product-images/instagram/<productId>-<n>.jpg` and
overwritten on each preview, so previewing repeatedly does not accumulate
files.

---

## Limits worth knowing

- **100 API posts per rolling 24 hours.** A carousel counts as one. The admin
  shows current usage.
- **10 images per carousel.** Products here carry 6–8, so this rarely binds.
- **2,200 characters per caption**, counted live in the composer.
- **30 hashtags.** Past the 30th, Instagram ignores them silently.
