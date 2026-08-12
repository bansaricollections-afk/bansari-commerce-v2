# Component Patterns Reference

Established structural conventions observed across the storefront. Match these rather than inventing new structures for the same kind of section.

## Section header pattern

Nearly every catalog-driven or editorial section (`CategoryShowcase`, `NewArrivals`, `BestSellers`, `TrendingCollections`) uses the same header structure:

```
┌─ eyebrow: small gold divider rule + uppercase letter-spaced label (0.6875rem, --bc-gold-dark)
├─ heading: Playfair Display, --bc-xl or --bc-2xl, often with an <em> italic word for emphasis
└─ optional "View all" / "Shop all" link on the far right, .bc-cta-ghost style, uppercase, underlined
```

Reproduce this exact shape (rule + eyebrow, heading with optional italic emphasis word, optional trailing link) for any new catalog section rather than designing a new header treatment per section.

## Product card pattern (`ProductCard.tsx`, `NewArrivalsRail.tsx`)

- Image container is `aspect-[3/4]` (or `aspect-ratio: 3/4` inline), `object-fit: cover`.
- Primary image and a hover/alternate image are stacked absolutely; hover crossfades between them via opacity transition (`opacity-0`/`opacity-100`, ~500-700ms). Falls back gracefully to just the primary image when the product has only one image (`hoverImage = images[1]?.url ?? images[0].url`).
- Badges (New, Best Seller, Low Stock, discount %) sit top-left, stacked, each a small uppercase pill-less label with a solid background color. Badge colors: New = `--bc-brand-mauve` or slate-900, Best Seller = amber-500, Low Stock = rose-600, discount = a red (`#B91C1C`).
- Wishlist heart icon sits top-right, always visible, 44×44px touch target (accessibility minimum).
- Quick View / Quick Add controls reveal on hover (desktop) via a bottom overlay that slides up.
- Below the image: optional collection/category eyebrow (small, uppercase, `--bc-brand-mauve` or `--bc-text-gold`), then the product name in Playfair Display, then price row (current price bold, compare-at price struck through in muted color, discount % badge if genuine).
- **Every badge and every price comparison must be backed by real data** — a discount badge only renders when `compare_price > price` is genuinely true in the database; a "New" badge only renders when the product's real `new_arrival` flag is true. Never add a badge unconditionally for visual balance.

## Accordion pattern (`ProductAccordion.tsx`, `FilterSidebar.tsx`'s `AccordionSection`)

Simple expand/collapse: a button header with a chevron that rotates 180° when open, content wrapped in a `max-height` transition (not `height: auto`, which cannot transition) — `maxHeight: open ? "800px" : "0px"` paired with `opacity` and `overflow: hidden`. Reuse this technique for any new expand/collapse UI rather than introducing a different animation approach.

## Editorial hero pattern (`EditorialHero.tsx` / `EditorialHeroCarousel.tsx`)

Full-bleed or near-full-bleed image, dark gradient scrim at the bottom for text legibility (`linear-gradient(to top, rgba(26,15,22,0.78) 0%, rgba(26,15,22,0.18) 55%, transparent 100%)` is the standard scrim), small uppercase eyebrow + serif headline + one primary CTA overlaid in the scrim area. If the hero is a carousel, dot indicators use small rectangular (not circular) buttons, matching the sharp-corners brand rule.

## Catalog-driven sections must be server components reading real data

Category/collection/product sections (`CategoryShowcase`, `NewArrivals`, `BestSellers`, `TrendingCollections`, the `/shop` and `/search` filter sidebars) are `async` server components calling the service layer directly (`getShopFacets()`, `getNewArrivals()`, `getBestSellers()`, `getFilteredProducts()` from `src/services/`). Reuse these functions rather than writing a new Supabase query — they already implement "derive from the real, active catalog only" correctly, including excluding products with no image, excluding inactive products, and returning empty arrays (not throwing) on failure so a section can degrade to `return null` instead of crashing the page.

## `Suspense` boundaries — do not add one without a `fallback`

**A specific past regression, avoid repeating it:** on a page using ISR (`export const revalidate = N`), a `<Suspense>` boundary with no `fallback` prop can render correctly in the initial server HTML and even in the RSC payload, then **silently collapse to nothing after client hydration** — the wrapped section (category grid, new arrivals, best sellers) disappears for real users even though it looks fine when checking server HTML alone. If a section doesn't need to stream in separately, don't wrap it in `Suspense` at all on a statically-rendered page — `getShopFacets()`/`getNewArrivals()`/etc. are already fast, cached, server-side calls. Only use `Suspense` with an explicit, sensible `fallback` (e.g. `<ProductGridSkeleton />`) when a section genuinely benefits from streaming independently of the rest of the page, as `/shop`'s `ProductGrid` does.

## Mobile parity for navigation/filter taxonomy

Any UI that lists categories or collections (header nav, mobile menu, shop filter sidebar, mobile filter bar, search overlay chips) must consume the exact same array from the exact same server call — never duplicate the list into a second hardcoded array "for mobile" or "for the overlay." Pass the same prop down. This is how `Header` → `HeaderClient` → `MobileMenu` / `HeaderSearchInput` → `InstantSearchOverlay` are wired: one `getShopFacets()` call at the top, props threaded down, zero independent taxonomy lists anywhere in the chain.

## Image handling

Use `next/image` with `fill` + a `sizes` attribute matching the container's real responsive width, not a guess. `ImageWithFallback` (`src/components/ui/ImageWithFallback.tsx`) is the established fallback chain for any image that might be missing: try the real URL, fall back to `/placeholder-product.jpg`, fall back to an inline branded SVG placeholder as a last resort. Use it (or its `product.images?.[0]?.url || '/placeholder.png'` inline equivalent, seen in several card components) rather than letting a broken image URL render a broken-image icon.
