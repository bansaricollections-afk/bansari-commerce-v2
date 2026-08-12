# Design Tokens Reference

Source of truth: `src/app/globals.css`. This file is a curated summary — if a value here ever disagrees with `globals.css`, `globals.css` wins. Re-read it directly for anything precision-critical.

## Typography

Fonts load via a single Google Fonts `@import` at the top of `globals.css`:

```
Playfair Display (400,500,600,700, italic 400/500)
Cormorant Garamond (300,400, italic 300/400)
Inter (300,400,500,600)
```

**Non-obvious but intentional:** components reference `var(--font-playfair), 'Playfair Display', Georgia, serif` and `var(--font-inter), 'Inter', sans-serif`. The CSS custom properties `--font-playfair` and `--font-inter` are **never actually declared** anywhere in the codebase — there is no `next/font` variable wiring them up. The fallback chain is what actually renders the font, sourced from the `@import` line. This works correctly today and is used dozens of times across `src/components/home/*`. Do not "fix" it by trying to define `--font-playfair`/`--font-inter` via `next/font` unless asked — that's a bigger change than it looks and every existing component already depends on the current fallback behavior working as-is. When adding a new component, copy the exact same fallback chain string rather than inventing a new one.

`.bc-serif-thin` (Cormorant Garamond, weight 300) is available as a lighter accent serif — used sparingly for italic editorial moments, not as a body or heading font.

### Type scale (fluid, use via `var(--bc-*)`)

| Token | clamp() | Typical use |
|---|---|---|
| `--bc-caption` | 0.6875–0.8125rem | Fine print, legal |
| `--bc-xs` | 0.75–0.875rem | Eyebrow labels, badges |
| `--bc-sm` | 0.875–1rem | Secondary body text |
| `--bc-base` | 1–1.125rem | Body copy |
| `--bc-md` | 1.125–1.375rem | Card titles |
| `--bc-lg` | 1.25–1.875rem | Section subheads |
| `--bc-xl` | 1.75–3rem | Section headings |
| `--bc-2xl` | 2.25–4.5rem | Page headings |
| `--bc-3xl` | 3–7.5rem | Hero display |
| `--bc-display` | 3.5–10rem | Full-bleed hero display |

Legacy aliases `--bc-text-xs` through `--bc-text-hero` exist with identical values (older naming, still in active use in some files) — either naming is acceptable, but prefer the shorter `--bc-*` form in new code.

## Color palette

### Brand
| Token | Hex | Use |
|---|---|---|
| `--bc-brand-mauve` | `#8A5A6A` | Primary brand color — links, active states, accents |
| `--bc-brand-mauve-dark` | `#714857` | Hover state for mauve elements |
| `--bc-brand-mauve-light` | `#B88A97` | Subtle mauve tints |
| `--bc-brand-mauve-faint` | `#F7F1F3` | Mauve-tinted backgrounds |
| `--bc-brand-plum` | `#2C1A24` | Deep plum, near-black warm tone |
| `--bc-brand-plum-mid` / `-light` | `#3D2535` / `#5C3A4F` | Plum gradient steps |

### Gold (reserve for premium/CTA moments — see SKILL.md)
| Token | Hex |
|---|---|
| `--bc-gold` | `#C9A96E` |
| `--bc-gold-light` | `#E2C98E` |
| `--bc-gold-faint` | `#F9F3E8` |
| `--bc-gold-dark` | `#9E7B47` |
| `--bc-gold-bright` | `#D4AF6B` |

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--bc-cream` | `#FFFDF9` | Default page background |
| `--bc-warm` | `#F6F0EB` | Secondary warm surface |
| `--bc-blush` | `#F8F2F0` | Best Sellers section background |
| `--bc-sand` | `#F4EDE3` | Alternate warm surface |
| `--bc-stone` | `#EDE6DC` | Image placeholder / border-adjacent surface |
| `--bc-dark` | `#1A0F16` | Full-bleed dark "statement" sections (footer, craftsmanship story) |
| `--bc-dark-mid` / `-soft` | `#241520` / `#2E1C2A` | Dark surface gradient steps |

### Text
| Token | Hex | Use |
|---|---|---|
| `--bc-text-ink` | `#1A0F16` | Primary text on light backgrounds |
| `--bc-text-rich` | `#2C1A24` | Slightly softer heading text |
| `--bc-text-mid` | `#4B3A43` | Secondary body text |
| `--bc-text-muted` | `#7A6872` | Tertiary/meta text |
| `--bc-text-faint` | `#B09AA4` | Disabled/very low emphasis |
| `--bc-text-inverse` | `#FFFDF9` | Text on dark surfaces |
| `--bc-text-gold` | `#C9A96E` | Gold-colored labels/eyebrows |

### Borders, overlays, shadows
- Borders: `--bc-border` (`#EDE6DC`), `--bc-border-soft` (`#F4EDE3`), `--bc-border-gold` (`#D4AF6B`), `--bc-border-dark` (translucent white for dark sections).
- Overlays (for image scrims): `--bc-overlay-light/mid/deep/editorial`, increasing opacity of `rgba(26,15,22,…)`.
- Shadows: `--bc-shadow-sm/md/lg/xl`, all a warm plum-tinted shadow (`rgba(44,26,36,…)`), not neutral gray — use these instead of a generic `box-shadow: 0 4px 12px rgba(0,0,0,.1)`.

## Spacing & layout

| Token | Value |
|---|---|
| `--bc-xs-space` … `--bc-3xl-space` | 0.5rem → 9rem |
| `--bc-section` | `clamp(4rem, 8vw, 9rem)` — standard vertical section padding |
| `--bc-gutter` | `clamp(1.25rem, 5vw, 5rem)` — standard horizontal page padding |
| `--bc-narrow` / `--bc-default` / `--bc-wide` / `--bc-full` | 680px / 1080px / 1360px / 1600px max-widths |

Use `--bc-wide` (1360px) as the default content max-width for most sections — it's what the majority of homepage/shop sections use. Legacy `--bc-content-narrow/default/wide` aliases exist with the same values.

## Radius — deliberately zero

`--radius-card: 0px` and `--radius-button: 0px`. Sharp corners everywhere is an intentional brand choice, not an oversight. Do not add `border-radius` to cards, buttons, or images unless explicitly asked to change this brand-wide.

## Transitions & z-index

| Token | Value |
|---|---|
| `--bc-fast` | 180ms `cubic-bezier(0.16,1,0.3,1)` — hover states |
| `--bc-base-t` | 320ms same easing — default transition |
| `--bc-slow` | 520ms — larger reveals |
| `--bc-reveal` | 800ms — scroll-triggered reveals |

All respect `prefers-reduced-motion` automatically (handled globally in `globals.css`) — no per-component media query needed.

Z-index scale: `--bc-z-base`(0) < `--bc-z-raised`(10) < `--bc-z-dropdown`(100) < `--bc-z-sticky`(200) < `--bc-z-overlay`(300) < `--bc-z-modal`(400) < `--bc-z-toast`(500).

## Canonical CTA classes — reuse, don't reinvent

Defined once in `globals.css`, used as the single source of truth for every homepage/storefront CTA:

- **`.bc-cta-primary`** — solid gold pill-less button, dark text, uppercase, letter-spaced. Use for the one primary action in a section ("Shop Now", "View All").
- **`.bc-cta-ghost`** — underlined text link, uppercase, low-opacity default with full opacity on hover/focus. Use for secondary actions.
- **`.bc-cta-ghost--inverse`** — same as ghost but for use on dark (`--bc-dark`) backgrounds.

Prefer applying these classes over writing new one-off button styles — most CTA-shaped needs are already covered by one of the three.

## Utility classes

`.bc-container` / `.bc-container--narrow` / `.bc-container--default` — centered max-width wrapper with the standard gutter padding. `.bc-section` — standard vertical section padding. `.bc-serif` / `.bc-serif-thin` — font-family shortcuts. `.bc-rule` / `.bc-rule--wide` — the thin gold horizontal divider line used throughout section headers (3rem / 5rem wide, 1px tall, gold).
