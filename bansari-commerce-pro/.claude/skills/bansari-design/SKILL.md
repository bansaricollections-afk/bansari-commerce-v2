---
name: bansari-design
description: This skill should be used when the user asks to "design a new page", "build a new section", "add a component", "style this", "create a new UI", "redesign", "match the Bansari brand", "build the design system", "add a homepage section", "style the shop/PDP/checkout", or any visual/UI work on the Bansari Collections storefront or admin. Provides the site's actual design tokens, typography, component conventions, and the commercial-truth rules established for this codebase.
---

# Bansari Collections — Design System

Bansari Collections is a luxury Indian ethnic-wear e-commerce site (kurta sets, co-ord sets, sarees as the catalog grows). The brand voice is editorial, restrained, and heritage-led — closer to a fashion magazine than a typical e-commerce template. Every design decision should read as intentional, not templated.

This skill packages three things: the site's real design tokens (colors, type, spacing — pulled directly from `src/app/globals.css`, not invented), the established component conventions, and the commercial-truth rules that govern what content is allowed to appear on the storefront. The truth rules are not optional style preferences — they were established through repeated production incidents on this exact site and apply to every visual change.

## Before designing anything

Read `src/app/globals.css` directly if precision on a token value matters — it is the single source of truth. The reference files in this skill are a curated summary and can drift; the CSS file cannot.

Check the catalog reality before designing around it. This site has run with as few as 7–9 active products, 2–3 categories, and 2–4 collections. Never design a layout that assumes a catalog size the business does not have (e.g. a 6-column category grid when there are 2 categories). Query the actual product/category/collection counts via the existing service layer (`src/services/product.service.ts`, `src/services/shop-facets.ts`) before laying out a catalog-driven section, and design so it degrades gracefully when sparse — see `references/imagery-and-truth-rules.md`.

## Design principles for this brand

**Editorial over generic e-commerce.** Favor sharp corners (this site uses `--radius-card: 0` and `--radius-button: 0` deliberately — no rounded corners anywhere), generous whitespace, large serif display type, and restrained gold accents over dense grids, drop shadows, and rounded pill buttons. When in doubt, look at how `EditorialHero.tsx` or `CraftsmanshipStory.tsx` are built and match that register, not a generic SaaS-dashboard register.

**Two typefaces, used consistently.** Playfair Display for every heading and any moment of emotional weight (product names, section titles, pull quotes). Inter for body copy, labels, buttons, and UI chrome. Cormorant Garamond is available as a lighter serif accent (`.bc-serif-thin`) for occasional editorial flourishes — do not overuse it. See `references/design-tokens.md` for the exact CSS variable / fallback chain to use (there is a specific, intentional oddity here — read it before touching font-family anywhere).

**Gold is a signal, not a background.** `--bc-gold` and its variants mark premium/CTA moments (primary buttons, badges, dividers, eyebrow labels). It should never become a large fill color or a default UI accent — reserve it the way the existing components do.

**Dark plum sections punctuate the page.** Sections like testimonials-adjacent content, the craftsmanship story, and footers use `--bc-dark` (`#1A0F16`) as a full-bleed background with cream text — this is the brand's "statement" surface. Use it sparingly, for one or two sections per page, not as a default.

## Styling convention: two valid approaches, used contextually

This codebase legitimately mixes two styling approaches — this is an existing, accepted convention, not something to "fix" or unify:

1. **Inline `style={{}}` objects referencing CSS custom properties** (`style={{ color: "var(--bc-text-ink)" }}`) — used throughout homepage/editorial sections (`src/components/home/*`) where fine-grained control over an editorial layout matters. New homepage or storefront-editorial components should follow this pattern to stay consistent with their neighbors.
2. **Tailwind v4 utility classes** (`className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"`) — used throughout `/shop`, `/collections`, `/search`, and admin UI, where responsive utility composition is more natural. This project uses Tailwind v4's CSS-first setup (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.*` file) — do not create a config file expecting the v3 JS-config pattern.

Match whichever convention the surrounding files already use rather than picking a favorite. Consult `references/component-patterns.md` for the established header/card/CTA patterns before inventing new ones — most sections follow an eyebrow-label + serif-heading + optional-"View all"-link header, and most CTAs should reuse the existing `.bc-cta-primary` / `.bc-cta-ghost` classes from `globals.css` rather than one-off button styles.

## Commercial truth is a hard constraint on every design

Read `references/imagery-and-truth-rules.md` before designing any section that shows products, ratings, counts, taxonomy, or brand claims. In summary, non-negotiably:

- Every product image must come from that product's own `images[]` array (Supabase `product-images` storage). Never use Unsplash, other stock photography, or placeholder/generic fashion imagery for anything that reads as a real product or real customer.
- Never invent ratings, review counts, customer counts, artisan counts, "trusted by X", founding years, or any other quantitative/social-proof claim not backed by real, queryable data. If a claim can't be sourced, omit it — do not soften it into a smaller invented number.
- Categories and collections shown anywhere (nav, filters, homepage cards, search) must be derived live from the product catalog (`getShopFacets()` / equivalent), never hardcoded as a literal list. The catalog changes; hardcoded taxonomy silently goes stale and produces dead, zero-result links.
- A sparse catalog is an acceptable design outcome. Degrade a section to fewer items, a simpler layout, or `return null` rather than padding it with fabricated products, filler copy, or stock imagery to look fuller.

## Reference files

- **`references/design-tokens.md`** — full color palette, type scale, spacing scale, shadows, transitions, and the canonical CTA/button classes, with exact CSS variable names to use.
- **`references/component-patterns.md`** — established structural patterns: section header layout, product card conventions (hover-reveal image, badge system), accordion sections, editorial hero patterns, and when to use `Suspense` around catalog-driven sections (there is a specific past regression to avoid here — a `Suspense` boundary with no `fallback` on a statically-rendered page silently drops its content after hydration).
- **`references/imagery-and-truth-rules.md`** — the full commercial-truth rules, why they exist, and the exact service-layer functions (`getShopFacets`, `getNewArrivals`, `getBestSellers`, `getFilteredProducts`) that already implement "derive from the real catalog" correctly — reuse them rather than writing new queries.

Load a reference file when the task touches its area; do not load all three for a small copy tweak.
