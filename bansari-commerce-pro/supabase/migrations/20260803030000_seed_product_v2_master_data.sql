-- =============================================================================
-- Migration : 20260803030000_seed_product_v2_master_data.sql
-- Purpose   : Seed all Product V2 lookup / master tables.
-- Strategy  : INSERT ... ON CONFLICT DO NOTHING  (fully idempotent).
-- Schema    : Verified against 20260718100000_product_management_v2_foundation.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CATEGORIES  (9 records)
-- Schema: id, name, slug, description, display_order, active, created_at, updated_at
-- Conflict: slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, display_order, active)
VALUES
  ('Sarees',       'sarees',       1, true),
  ('Kurta Sets',   'kurta-sets',   2, true),
  ('Kurtis',       'kurtis',       3, true),
  ('Dresses',      'dresses',      4, true),
  ('Co-Ord Sets',  'co-ord-sets',  5, true),
  ('Gowns',        'gowns',        6, true),
  ('Dupattas',     'dupattas',     7, true),
  ('Bottom Wear',  'bottom-wear',  8, true),
  ('Western Wear', 'western-wear', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SUBCATEGORIES  (22 records)
-- Schema: id, category_id, name, slug, description, display_order, active, created_at, updated_at
-- Conflict: slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.subcategories (name, slug, category_id, display_order, active)
SELECT v.name, v.slug, c.id, v.ord, true
FROM (
  VALUES
    ('Silk Sarees',        'silk-sarees',        'sarees',       1),
    ('Cotton Sarees',      'cotton-sarees',      'sarees',       2),
    ('Georgette Sarees',   'georgette-sarees',   'sarees',       3),
    ('Designer Sarees',    'designer-sarees',    'sarees',       4),
    ('Anarkali Sets',      'anarkali-sets',      'kurta-sets',   1),
    ('Straight Sets',      'straight-sets',      'kurta-sets',   2),
    ('Palazzo Sets',       'palazzo-sets',       'kurta-sets',   3),
    ('Casual Kurtis',      'casual-kurtis',      'kurtis',       1),
    ('Printed Kurtis',     'printed-kurtis',     'kurtis',       2),
    ('Embroidered Kurtis', 'embroidered-kurtis', 'kurtis',       3),
    ('Maxi Dresses',       'maxi-dresses',       'dresses',      1),
    ('Midi Dresses',       'midi-dresses',       'dresses',      2),
    ('Mini Dresses',       'mini-dresses',       'dresses',      3),
    ('Top & Skirt',        'top-and-skirt',      'co-ord-sets',  1),
    ('Top & Pants',        'top-and-pants',      'co-ord-sets',  2),
    ('Party Gowns',        'party-gowns',        'gowns',        1),
    ('Anarkali Gowns',     'anarkali-gowns',     'gowns',        2),
    ('Palazzos',           'palazzos',           'bottom-wear',  1),
    ('Skirts',             'skirts',             'bottom-wear',  2),
    ('Sharara',            'sharara',            'bottom-wear',  3),
    ('Tops',               'tops',               'western-wear', 1),
    ('Jumpsuits',          'jumpsuits',          'western-wear', 2)
) AS v(name, slug, cat_slug, ord)
JOIN public.categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. COLLECTIONS  (8 records)
-- Schema: id, name, slug, description, banner_url, display_order, active, created_at, updated_at
-- Conflict: slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.collections (name, slug, display_order, active)
VALUES
  ('Everyday',    'everyday',    1, true),
  ('Festive',     'festive',     2, true),
  ('Wedding',     'wedding',     3, true),
  ('Office Wear', 'office-wear', 4, true),
  ('Party Wear',  'party-wear',  5, true),
  ('Summer',      'summer',      6, true),
  ('Winter',      'winter',      7, true),
  ('Premium',     'premium',     8, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. ATTR_COLOR  (23 records)
-- Schema: id, name, slug, hex, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_color (name, slug, hex, display_order, active)
VALUES
  ('Black',     'black',     '#000000',  1, true),
  ('White',     'white',     '#FFFFFF',  2, true),
  ('Red',       'red',       '#E53935',  3, true),
  ('Maroon',    'maroon',    '#800000',  4, true),
  ('Pink',      'pink',      '#F48FB1',  5, true),
  ('Peach',     'peach',     '#FFCBA4',  6, true),
  ('Yellow',    'yellow',    '#FDD835',  7, true),
  ('Mustard',   'mustard',   '#FFDB58',  8, true),
  ('Orange',    'orange',    '#FB8C00',  9, true),
  ('Green',     'green',     '#43A047', 10, true),
  ('Olive',     'olive',     '#808000', 11, true),
  ('Mint',      'mint',      '#98FF98', 12, true),
  ('Blue',      'blue',      '#1E88E5', 13, true),
  ('Navy',      'navy',      '#001F5B', 14, true),
  ('Sky Blue',  'sky-blue',  '#87CEEB', 15, true),
  ('Purple',    'purple',    '#8E24AA', 16, true),
  ('Lavender',  'lavender',  '#E6E6FA', 17, true),
  ('Grey',      'grey',      '#9E9E9E', 18, true),
  ('Brown',     'brown',     '#6D4C41', 19, true),
  ('Beige',     'beige',     '#F5F0DC', 20, true),
  ('Cream',     'cream',     '#FFFDD0', 21, true),
  ('Gold',      'gold',      '#FFD700', 22, true),
  ('Silver',    'silver',    '#C0C0C0', 23, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. ATTR_FABRIC  (12 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_fabric (name, slug, display_order, active)
VALUES
  ('Cotton',      'cotton',      1,  true),
  ('Pure Cotton', 'pure-cotton', 2,  true),
  ('Mul Cotton',  'mul-cotton',  3,  true),
  ('Rayon',       'rayon',       4,  true),
  ('Viscose',     'viscose',     5,  true),
  ('Georgette',   'georgette',   6,  true),
  ('Chiffon',     'chiffon',     7,  true),
  ('Silk',        'silk',        8,  true),
  ('Roman Silk',  'roman-silk',  9,  true),
  ('Organza',     'organza',     10, true),
  ('Linen',       'linen',       11, true),
  ('Muslin',      'muslin',      12, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. ATTR_OCCASION  (6 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_occasion (name, slug, display_order, active)
VALUES
  ('Casual',     'casual',     1, true),
  ('Office',     'office',     2, true),
  ('Party',      'party',      3, true),
  ('Festive',    'festive',    4, true),
  ('Wedding',    'wedding',    5, true),
  ('Daily Wear', 'daily-wear', 6, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. ATTR_PATTERN  (7 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_pattern (name, slug, display_order, active)
VALUES
  ('Printed',     'printed',     1, true),
  ('Solid',       'solid',       2, true),
  ('Embroidered', 'embroidered', 3, true),
  ('Floral',      'floral',      4, true),
  ('Striped',     'striped',     5, true),
  ('Checked',     'checked',     6, true),
  ('Self Design', 'self-design', 7, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. ATTR_FIT  (5 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_fit (name, slug, display_order, active)
VALUES
  ('Regular',  'regular',  1, true),
  ('Straight', 'straight', 2, true),
  ('A-Line',   'a-line',   3, true),
  ('Flared',   'flared',   4, true),
  ('Relaxed',  'relaxed',  5, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. ATTR_SLEEVE  (4 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_sleeve (name, slug, display_order, active)
VALUES
  ('Sleeveless',    'sleeveless',    1, true),
  ('Half Sleeve',   'half-sleeve',   2, true),
  ('Three Quarter', 'three-quarter', 3, true),
  ('Full Sleeve',   'full-sleeve',   4, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. ATTR_NECK  (7 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_neck (name, slug, display_order, active)
VALUES
  ('Round',    'round',    1, true),
  ('V',        'v',        2, true),
  ('Mandarin', 'mandarin', 3, true),
  ('Boat',     'boat',     4, true),
  ('Square',   'square',   5, true),
  ('Keyhole',  'keyhole',  6, true),
  ('Notch',    'notch',    7, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. ATTR_WORK  (7 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_work (name, slug, display_order, active)
VALUES
  ('Printed',      'printed',      1, true),
  ('Thread Work',  'thread-work',  2, true),
  ('Mirror Work',  'mirror-work',  3, true),
  ('Zari',         'zari',         4, true),
  ('Sequins',      'sequins',      5, true),
  ('Foil Print',   'foil-print',   6, true),
  ('Lace',         'lace',         7, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. ATTR_LENGTH  (4 records)
-- Schema: id, name, slug, display_order, active
-- Conflict: name (unique), slug (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_length (name, slug, display_order, active)
VALUES
  ('Short', 'short', 1, true),
  ('Calf',  'calf',  2, true),
  ('Ankle', 'ankle', 3, true),
  ('Floor', 'floor', 4, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. SIZE_MASTER  (8 records)
-- Schema: id, name, sort_order, active
-- Conflict: name (unique)
-- Note: foundation migration 20260718100000 already seeds these with
--       sort_order 10/20/.../80. This is a safe no-op on live DB.
-- ---------------------------------------------------------------------------
INSERT INTO public.size_master (name, sort_order, active)
VALUES
  ('XS',  10, true),
  ('S',   20, true),
  ('M',   30, true),
  ('L',   40, true),
  ('XL',  50, true),
  ('XXL', 60, true),
  ('3XL', 70, true),
  ('4XL', 80, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. SIZE_CHARTS  (1 default chart)
-- Schema: id, name, description, chart_data (jsonb), created_at, updated_at
-- No is_active column. No size_chart_entries table.
-- chart_data stores measurements inline as a JSONB array.
-- Conflict: name (unique)
-- ---------------------------------------------------------------------------
INSERT INTO public.size_charts (name, description, chart_data)
VALUES (
  'Standard Indian Size Chart',
  'Default size chart for all categories',
  '[
    {"size": "XS",  "bust": 76, "waist": 60, "hip": 82,  "length": 50},
    {"size": "S",   "bust": 80, "waist": 64, "hip": 86,  "length": 51},
    {"size": "M",   "bust": 84, "waist": 68, "hip": 90,  "length": 52},
    {"size": "L",   "bust": 88, "waist": 72, "hip": 94,  "length": 53},
    {"size": "XL",  "bust": 92, "waist": 76, "hip": 98,  "length": 54},
    {"size": "XXL", "bust": 96, "waist": 80, "hip": 102, "length": 55},
    {"size": "3XL", "bust": 100,"waist": 84, "hip": 106, "length": 56},
    {"size": "4XL", "bust": 104,"waist": 88, "hip": 110, "length": 57}
  ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15. Reload PostgREST schema cache
-- ---------------------------------------------------------------------------
SELECT pg_notify('pgrst', 'reload schema');
