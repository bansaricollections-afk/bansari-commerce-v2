-- Catalog additions requested by the business:
--   1. Two missing categories: Co-Ord Sets, Tops
--   2. Brown was missing from the colour palette; palette reviewed and
--      extended with the ethnic-wear shades that were absent.
--
-- Both `sort_order` (original production column) and `display_order` (added by
-- 20260810140000 to match what catalog.service.ts selects) are written so the
-- two stay consistent. Likewise `hex` and `hex_code` on attr_color.
--
-- Idempotent: re-running inserts nothing new (unique constraint on name/slug).
-- Non-destructive: no existing row is modified or removed.

-- ── 1. Categories ──────────────────────────────────────────────────────────
insert into public.categories (name, slug, active, sort_order, display_order)
values
  ('Co-Ord Sets', 'co-ord-sets', true, 7, 7),
  ('Tops',        'tops',        true, 8, 8)
on conflict (name) do nothing;

-- ── 2. Colour palette ──────────────────────────────────────────────────────
-- Brown (explicitly requested) plus the shades commonly used in Indian ethnic
-- wear that the existing 20-colour palette did not cover.
insert into public.attr_color (name, slug, hex, hex_code, active, sort_order, display_order)
values
  ('Brown',        'brown',        '#8B4513', '#8B4513', true, 21, 21),
  ('Rust',         'rust',         '#B7410E', '#B7410E', true, 22, 22),
  ('Olive',        'olive',        '#808000', '#808000', true, 23, 23),
  ('Wine',         'wine',         '#722F37', '#722F37', true, 24, 24),
  ('Bottle Green', 'bottle-green', '#006A4E', '#006A4E', true, 25, 25),
  ('Turquoise',    'turquoise',    '#40E0D0', '#40E0D0', true, 26, 26),
  ('Coral',        'coral',        '#FF7F50', '#FF7F50', true, 27, 27),
  ('Magenta',      'magenta',      '#C2185B', '#C2185B', true, 28, 28),
  ('Rani Pink',    'rani-pink',    '#E3006D', '#E3006D', true, 29, 29),
  ('Sky Blue',     'sky-blue',     '#87CEEB', '#87CEEB', true, 30, 30),
  ('Mint',         'mint',         '#98D8A8', '#98D8A8', true, 31, 31),
  ('Charcoal',     'charcoal',     '#36454F', '#36454F', true, 32, 32),
  ('Ivory',        'ivory',        '#FFFFF0', '#FFFFF0', true, 33, 33),
  ('Off White',    'off-white',    '#FAF9F6', '#FAF9F6', true, 34, 34),
  ('Tan',          'tan',          '#D2B48C', '#D2B48C', true, 35, 35),
  ('Multicolour',  'multicolour',  null,      null,      true, 36, 36)
on conflict (name) do nothing;
