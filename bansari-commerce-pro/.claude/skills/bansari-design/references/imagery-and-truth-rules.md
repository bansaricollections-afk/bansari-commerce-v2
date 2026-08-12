# Imagery & Commercial-Truth Rules

These rules came from real production incidents on this site, not theoretical caution. Every one below was found live on `bansaricollection.in` at some point and had to be removed. Treat this as a checklist before shipping any visual or copy change, not a suggestion.

## Imagery

- **Only real product photography from Supabase storage.** Every product image URL must come from that product's own `images[]` array (`https://pgpirjzgrvrfbxnampoa.supabase.co/storage/v1/object/public/product-images/…`). Never use `images.unsplash.com`, `images.pexels.com`, `picsum.photos`, or any other stock/generic photography for anything presented as a real product, real customer, or real brand moment.
- **A section with no real image for an item should omit that item, not substitute a stock photo.** Several sections (`CategoryShowcase`, `TrendingCollections`) explicitly filter out any category/collection with no real product image (`.filter(([, info]) => info.image)`) rather than falling back to a placeholder graphic for a "real" catalog entry. Follow the same pattern for new catalog-driven UI.
- **Broken/missing images degrade through the established fallback chain** (`ImageWithFallback`, or the inline `?? '/placeholder.png'` pattern), never a raw `<img>` with no fallback.
- Check with a real grep before considering an imagery change done: `grep -rniE "unsplash|pexels|picsum" src/` should return nothing new outside dead/unreferenced components (a few exist historically — see "Known dead code" below — do not treat those as license to add more).

## Never fabricate quantitative or social-proof claims

Do not add, and remove on sight if found:
- Star ratings, review counts, or "(N reviews)" anywhere customer-facing, unless the business has a real, queryable reviews table with real review data. This site's `products.rating`/`products.review_count` columns currently hold seeded placeholder values with zero real reviews behind them (`order_items` is empty, no reviews table exists) — the service layer (`product.service.ts` `mapRow()`) deliberately withholds these fields from every consumer for exactly this reason. Do not reintroduce them without a real review system.
- Customer counts, member counts, artisan/family counts, "trusted by X", "X+ happy customers", or similar — unless backed by real, sourced business data the user has explicitly confirmed.
- Founding year / "Est. YYYY" — this site had two contradictory founding years in different components (2011 and 2018) with no authoritative source anywhere in the repo; both were removed rather than guessed. Do not add a founding year without an explicit, current instruction confirming the correct one.
- Fabricated testimonials or customer quotes of any kind.
- A "Best Seller" or trending claim that isn't backed by a real flag or real, positive data (page views, an admin-set flag) — never rank by invented sales numbers.

**The standard, stated plainly:** if a claim can't be traced to a real database value, a published policy, or an explicit instruction from the business owner, it does not go on the site — not even in a softened or smaller form. Omission is always the correct fallback for an unknown fact, not a smaller invented number.

## Taxonomy (categories/collections) must be catalog-derived, never hardcoded

This was the single most repeated defect class on this site. Any UI listing categories or collections — header nav, mobile menu, footer, shop filter sidebar, mobile filter bar, search overlay/quick-links, homepage category or collection cards — must call `getShopFacets()` (or the equivalent existing service function) and render its result, never a literal hardcoded array of category/collection names.

Why this matters concretely: this catalog's active categories and collections have changed multiple times during development (products re-categorized, collections added/removed). Every time a component hardcoded its own taxonomy list, that list went stale and started linking to `/shop?category=X` destinations that returned zero products — a dead link that returns HTTP 200, which is easy to miss if only checking status codes. The fix that actually holds up over time is architectural: one server-side `getShopFacets()` call, cached per-request via React `cache()`, with the result threaded down as props to every UI surface that needs it. Verify a taxonomy change by checking product **counts** at each generated link, not just that the link returns 200.

## Shipping / pricing claims must match the actual billing logic

If a component states a shipping cost, threshold, or "free shipping" claim, it must import `SHIPPING_THRESHOLD` / `STANDARD_SHIPPING` (or call `getShippingCost()`) from `src/lib/shipping.ts` rather than hardcoding a number. This is the same class of bug as hardcoded taxonomy: three separate files once independently hardcoded the same `2999`/`99` figures, and a copy claim elsewhere on the site said something different (`₹999`) from what checkout actually charged. Never state "free shipping on all orders" — this site has a threshold below which a flat fee applies; state the threshold.

## Sparse catalog is an acceptable design outcome

This site has run with as few as 7–9 active products. A design that looks sparse because the real catalog is small is correct and should not be "fixed" by adding filler content, extra fabricated products, wider grids padded with repeats, or stock imagery to look fuller. Prefer: fewer, well-presented real items; a section that gracefully omits itself (`return null`) when it has nothing real to show; honest empty states with a link to the full catalog (see `new-arrivals/page.tsx`'s `EmptyState` component) rather than a page that pretends to have content it doesn't.

## Known dead code — do not copy patterns from these

`CategoryPills.tsx`, `ShopByCategory.tsx`, `CategoryGrid.tsx`, `HomeTrustStrip.tsx`, `WhyChooseUs.tsx`, `src/config/filters.ts`, `src/data/categories.ts`, `src/data/products/kurtaSets.ts` are unreferenced anywhere in the app and still contain fabricated taxonomy (Sarees, Lehengas, Gowns, Wedding Edit, etc.) or placeholder review counts left over from earlier development. They are harmless because nothing imports them, but do not use them as a reference for "how this site names its categories" — they are stale. `src/services/reviews.ts` is a deliberate no-op placeholder for a future reviews system; it returns nothing today and should stay that way until a real reviews table exists.
