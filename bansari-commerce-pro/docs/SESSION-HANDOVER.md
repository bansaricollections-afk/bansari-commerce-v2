# Session handover — 25 Sep 2026

Written to be pasted into, or read at the start of, a new chat. Everything
below is verified against the live database and the live site on the date
above, not recalled.

Nothing here contains a credential. Where a secret is involved it is named and
its location given, never its value.

---

## 1. Live state, measured

**Catalogue**

| | |
|---|---|
| Active products | 59 |
| Inactive (soft-deleted) | 6 |
| Reviews (real) | 0 |
| Paid orders, not cancelled | 4 |
| Revenue to date | ₹2,480 |
| Orders carrying attribution data | 2 |

**Instagram** — connected as `@bansari_collections`, 4 posts published from the
admin:

| Post | Product | Permalink |
|---|---|---|
| #3 | 41 | instagram.com/p/DdlVAN2FRiB |
| #4 | 48 | instagram.com/p/DdlYUMBlOVZ |
| #5 | 37 | instagram.com/p/DdmgTcfDhhm |
| #6 | 51 | instagram.com/p/DdrezG5jumL |

Row #2 is a recorded failure for product 41 — Meta returned an error while the
post was in fact live, which is the bug that produced the duplicate. Kept, not
deleted; it is the evidence the recovery path now exists for.

**Coupons** — both private (`is_public = false`), neither advertised on the
storefront:

- `FIRSTVISIT10` — 10%, 0 of 500 used. The parcel-insert card code.
- `RAKSHA20` — 20%, 0 of 1 used. Single-use; was briefly exposed site-wide.

**Search Console**, 3 months to 23 Sep:

| | |
|---|---|
| Impressions | 702 |
| Clicks | 20 |
| Average position | **6.4** |
| Pages indexed | **27** |
| Pages not indexed | **104** |
| Homepage share of impressions | **547 of 702 (78%)** |

**Infrastructure**

- Vercel functions: `bom1` (Mumbai). Set in `vercel.json`.
- Supabase: `ap-south-1` (Mumbai). They now match — this was the main
  performance fix.
- Cloudflare proxies the domain. It weakens Vercel's bot-detection signals.
- Vercel Firewall → Bot Protection: **Log mode**, recording but acting on
  nothing.

---

## 2. What shipped

Twenty-four commits. Grouped by what they were for.

**Instagram, end to end** — `/admin/instagram`
Product posts and guide carousels compose, preview and publish. Captions are
generated from the product's own attributes so they cannot disagree with the
product page. Images are padded to Instagram's 4:5 minimum on the brand cream,
never cropped: 65% of this catalogue is 2:3 or 3:4 and would otherwise be
rejected outright. Five rotated hashtags, not thirty copy-pasted ones. A reel
generator produces a 9:16 MP4 to download and post from the phone — it does
not auto-post, because the API cannot attach trending audio and posting
without it would cost reach.

**Guides that update themselves**
A `productFeed` block stores a filter rather than product ids, answered from
the catalogue on every render. Add a cotton kurta set and it appears in the
Navratri guide with no edit. Renders nothing at all — heading included — when
fewer than `minProducts` match.

**Attribution** — `/admin/attribution`
`orders.marketing_json` had been written on every order since attribution
shipped and read by nothing. This reads it. Counts and rupees only, never
percentages, with an explicit "too few orders" banner below ~30.

**Performance**
Functions moved Washington DC → Mumbai; slow pages roughly halved and the
worst case fell 7.3s → 2.3s. List queries stopped fetching product-page
columns: 91.5KB → 41.4KB and 406ms → 51ms per page of 24.

**Truth pass**
Nine places claimed the shop manufactures. It does not — it sources from
Jaipur artisans and from manufacturers, and sells in Vadodara. Corrected
across the homepage, shop page, cart, announcement bar, new-account email and
the homepage meta description.

**Fixes**
Deleted products were still reachable at their own URL. The admin category
dropdown buried the largest category last. A product image carried another
company's shop sign. A failed publish is no longer assumed to mean nothing was
published.

---

## 3. Waiting on the merchant

**(a) Is the mirror work Gujarati or Kutch?**
The highest-value SEO question open. Three queries — "gujarati mirror work
suits/kurtis/kurti" — already rank **3.8 to 8.5**, from the homepage, with no
effort. The right page exists (`/shop/mirror-work-kurta-sets`) and does not
contain the word.

Only **1 of 12** active mirror-work products states a Gujarati or Kutch origin
anywhere. Putting "Gujarati" in the title would claim a regional provenance for
eleven products that do not state one — the same class of claim removed in the
truth pass. If the pieces genuinely are that style, set it in the product data
and the title becomes both true and a match.

**(b) Product photography**
Product images are AI-generated. Instagram has detected this and labels the
account **"AI-generated profile"** on every post. The merchant has the real
garments.

Costs: the label sits beside a ₹2,149 price; Instagram Shopping approval
requires images that accurately represent the product; Myntra, Amazon and
Flipkart are stricter still; and returns are paid both ways under the
published policy.

One AI image was found containing an invented shop sign reading **"TARINI
JAIPUR"** — product 17, then the primary image, and therefore in both merchant
feeds. Fixed. **The other AI images have not been reviewed**, and nothing
automated can check for invented brand names or garbled text.

Agreed direction: real photo first on each product; AI renders stay as
additional images and for banners.

**(c) Facebook Page URL** — `brand.ts` links a guess.

**(d) Store geo coordinates** — `22.3072, 73.1812` is central Vadodara; the
shop is at BIL, further out.

---

## 4. Deliberately not done

- **Bot Protection is in Log mode, not Challenge.** Vercel's own warning says
  "non-browser traffic is challenged" — which includes Cashfree payment
  webhooks and the product feeds. Read the log first, add bypass rules for
  `/api/` payment and feed paths, then switch.
- **`/product/[id]` is `force-dynamic`** — never cached. ISR would make repeat
  views near-instant but stock accuracy sets the revalidate window.
- **`/shop`'s `revalidate = 60` never applies** because it reads searchParams.
- **Not-found pages return HTTP 200**, not 404. They do emit `noindex`
  (verified), so search engines will not index them.
- **Ahrefs/Semrush keyword research.** With 104 pages unindexed, buying volume
  estimates means planning traffic for pages that cannot receive any. Revisit
  past ~80 indexed. An Ahrefs MCP connector exists in the workspace but needs
  authorising from claude.ai connector settings.

---

## 5. Operational notes

**Deploy cadence.** Vercel Hobby allows 100 deploys per 24h and each change
costs roughly two. Batch, and deploy only when asked. `git push` to `main`
deploys automatically.

**A stray `build` script sits uncommitted in the ROOT `package.json`.** It is
stashed and restored around every push. Decide whether to commit or revert it.

**Instagram token expires in ~60 days** and refreshes only while in use. Post
at least once every couple of months. An expired token reads as "not
connected" rather than erroring. Re-issue via `docs/instagram-setup.md` from
step 3c.

**Never mark `NEXT_PUBLIC_*` variables Sensitive in Vercel** — they are inlined
at build time and Sensitive withholds them, so the value silently becomes
undefined. Server-side secrets like `IG_ACCESS_TOKEN` are read at runtime and
are correctly Secret.

**Migrations are applied by hand** in the Supabase SQL editor. Write them
idempotent — one in this session was not, was run twice, and rotated an image
array to the wrong position.

**Measurements from this environment are ~120KB/s from Mumbai.** Useful for
before-and-after comparison, useless as an estimate of a customer's
experience. Speed Insights now collects the real thing.

---

## 6. The strategic picture, honestly

Traffic is the binding constraint, and there is no code that manufactures
visitors.

What exists today: **4 paid orders**, **~138 Instagram followers**, **27 pages
indexed**, and marketplace buyers who already trust the product. Almost all
search impressions land on the homepage because almost nothing else is
eligible to rank.

The levers that are actually working, in order of proven value:

1. **Marketplace buyers.** They have paid and are holding the product. The
   parcel-insert card reaches them for the price of paper, carries
   `FIRSTVISIT10` and the Instagram handle, and its redemption count is the
   measurement. `Admin → Parcel Insert`.
2. **Indexing.** 104 pages Google knows about and has not indexed. Four were
   manually submitted on 23 Sep. Nothing in SEO matters until this moves.
3. **Real photographs.** Unblocks Instagram Shopping, removes the AI label,
   reduces returns, and satisfies marketplace policy. Only the merchant can
   do it.
4. **Reels with trending audio.** The main reach mechanism for a small
   account, and in-app only — no tool can automate the audio.

Everything built this session removes friction from those four. None of it
substitutes for them.
