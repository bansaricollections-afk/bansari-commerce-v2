-- =============================================================================
-- Migration : 20260803030000_seed_product_v2_master_data.sql
-- Purpose   : Seed all Product V2 lookup / master tables.
-- Strategy  : INSERT ... ON CONFLICT DO NOTHING  (fully idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CATEGORIES  (9 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, is_active, display_order)
VALUES
  ('Sarees',       'sarees',       true,  1),
  ('Kurta Sets',   'kurta-sets',   true,  2),
  ('Kurtis',       'kurtis',       true,  3),
  ('Dresses',      'dresses',      true,  4),
  ('Co-Ord Sets',  'co-ord-sets',  true,  5),
  ('Gowns',        'gowns',        true,  6),
  ('Dupattas',     'dupattas',     true,  7),
  ('Bottom Wear',  'bottom-wear',  true,  8),
  ('Western Wear', 'western-wear', true,  9)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SUBCATEGORIES  (22 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.subcategories (name, slug, category_id, is_active, display_order)
SELECT v.name, v.slug, c.id, true, v.ord
FROM (
  VALUES
    -- Sarees
    ('Silk Sarees',      'silk-sarees',      'sarees',       1),
    ('Cotton Sarees',    'cotton-sarees',    'sarees',       2),
    ('Georgette Sarees', 'georgette-sarees', 'sarees',       3),
    ('Designer Sarees',  'designer-sarees',  'sarees',       4),
    -- Kurta Sets
    ('Anarkali Sets',    'anarkali-sets',    'kurta-sets',   1),
    ('Straight Sets',    'straight-sets',    'kurta-sets',   2),
    ('Palazzo Sets',     'palazzo-sets',     'kurta-sets',   3),
    -- Kurtis
    ('Casual Kurtis',    'casual-kurtis',    'kurtis',       1),
    ('Printed Kurtis',   'printed-kurtis',   'kurtis',       2),
    ('Embroidered Kurtis','embroidered-kurtis','kurtis',     3),
    -- Dresses
    ('Maxi Dresses',     'maxi-dresses',     'dresses',      1),
    ('Midi Dresses',     'midi-dresses',     'dresses',      2),
    ('Mini Dresses',     'mini-dresses',     'dresses',      3),
    -- Co-Ord Sets
    ('Top & Skirt',      'top-and-skirt',    'co-ord-sets',  1),
    ('Top & Pants',      'top-and-pants',    'co-ord-sets',  2),
    -- Gowns
    ('Party Gowns',      'party-gowns',      'gowns',        1),
    ('Anarkali Gowns',   'anarkali-gowns',   'gowns',        2),
    -- Bottom Wear
    ('Palazzos',         'palazzos',         'bottom-wear',  1),
    ('Skirts',           'skirts',           'bottom-wear',  2),
    ('Sharara',          'sharara',          'bottom-wear',  3),
    -- Western Wear
    ('Tops',             'tops',             'western-wear', 1),
    ('Jumpsuits',        'jumpsuits',        'western-wear', 2)
) AS v(name, slug, cat_slug, ord)
JOIN public.categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. COLLECTIONS  (8 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.collections (name, slug, is_active, display_order)
VALUES
  ('Everyday',    'everyday',    true, 1),
  ('Festive',     'festive',     true, 2),
  ('Wedding',     'wedding',     true, 3),
  ('Office Wear', 'office-wear', true, 4),
  ('Party Wear',  'party-wear',  true, 5),
  ('Summer',      'summer',      true, 6),
  ('Winter',      'winter',      true, 7),
  ('Premium',     'premium',     true, 8)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. ATTR_COLOR  (23 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_color (name, hex_code, is_active)
VALUES
  ('Black',     '#000000', true),
  ('White',     '#FFFFFF', true),
  ('Red',       '#E53935', true),
  ('Maroon',    '#800000', true),
  ('Pink',      '#F48FB1', true),
  ('Peach',     '#FFCBA4', true),
  ('Yellow',    '#FDD835', true),
  ('Mustard',   '#FFDB58', true),
  ('Orange',    '#FB8C00', true),
  ('Green',     '#43A047', true),
  ('Olive',     '#808000', true),
  ('Mint',      '#98FF98', true),
  ('Blue',      '#1E88E5', true),
  ('Navy',      '#001F5B', true),
  ('Sky Blue',  '#87CEEB', true),
  ('Purple',    '#8E24AA', true),
  ('Lavender',  '#E6E6FA', true),
  ('Grey',      '#9E9E9E', true),
  ('Brown',     '#6D4C41', true),
  ('Beige',     '#F5F0DC', true),
  ('Cream',     '#FFFDD0', true),
  ('Gold',      '#FFD700', true),
  ('Silver',    '#C0C0C0', true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. ATTR_FABRIC  (12 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_fabric (name, is_active)
VALUES
  ('Cotton',       true),
  ('Pure Cotton',  true),
  ('Mul Cotton',   true),
  ('Rayon',        true),
  ('Viscose',      true),
  ('Georgette',    true),
  ('Chiffon',      true),
  ('Silk',         true),
  ('Roman Silk',   true),
  ('Organza',      true),
  ('Linen',        true),
  ('Muslin',       true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. ATTR_OCCASION  (6 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_occasion (name, is_active)
VALUES
  ('Casual',     true),
  ('Office',     true),
  ('Party',      true),
  ('Festive',    true),
  ('Wedding',    true),
  ('Daily Wear', true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. ATTR_PATTERN  (7 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_pattern (name, is_active)
VALUES
  ('Printed',     true),
  ('Solid',       true),
  ('Embroidered', true),
  ('Floral',      true),
  ('Striped',     true),
  ('Checked',     true),
  ('Self Design', true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. ATTR_FIT  (5 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_fit (name, is_active)
VALUES
  ('Regular',  true),
  ('Straight', true),
  ('A-Line',   true),
  ('Flared',   true),
  ('Relaxed',  true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. ATTR_SLEEVE  (4 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_sleeve (name, is_active)
VALUES
  ('Sleeveless',     true),
  ('Half Sleeve',    true),
  ('Three Quarter',  true),
  ('Full Sleeve',    true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. ATTR_NECK  (7 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_neck (name, is_active)
VALUES
  ('Round',    true),
  ('V',        true),
  ('Mandarin', true),
  ('Boat',     true),
  ('Square',   true),
  ('Keyhole',  true),
  ('Notch',    true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. ATTR_WORK  (7 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_work (name, is_active)
VALUES
  ('Printed',      true),
  ('Thread Work',  true),
  ('Mirror Work',  true),
  ('Zari',         true),
  ('Sequins',      true),
  ('Foil Print',   true),
  ('Lace',         true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. ATTR_LENGTH  (4 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.attr_length (name, is_active)
VALUES
  ('Short',  true),
  ('Calf',   true),
  ('Ankle',  true),
  ('Floor',  true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. SIZE_MASTER  (8 records)
-- ---------------------------------------------------------------------------
INSERT INTO public.size_master (name, sort_order, is_active)
VALUES
  ('XS',  1, true),
  ('S',   2, true),
  ('M',   3, true),
  ('L',   4, true),
  ('XL',  5, true),
  ('XXL', 6, true),
  ('3XL', 7, true),
  ('4XL', 8, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. SIZE_CHARTS  (1 default chart) + SIZE_CHART_ENTRIES
-- ---------------------------------------------------------------------------
INSERT INTO public.size_charts (name, description, is_active)
VALUES
  ('Standard Indian Size Chart', 'Default size chart for all categories', true)
ON CONFLICT (name) DO NOTHING;

-- Link all 8 sizes to the default chart
INSERT INTO public.size_chart_entries (size_chart_id, size_master_id, chest_cm, waist_cm, hip_cm, length_cm)
SELECT
  sc.id,
  sm.id,
  v.chest,
  v.waist,
  v.hip,
  v.length
FROM public.size_charts sc
CROSS JOIN (
  SELECT sm2.id, v2.chest, v2.waist, v2.hip, v2.length
  FROM public.size_master sm2
  JOIN (
    VALUES
      ('XS',  76, 60,  82,  50),
      ('S',   80, 64,  86,  51),
      ('M',   84, 68,  90,  52),
      ('L',   88, 72,  94,  53),
      ('XL',  92, 76,  98,  54),
      ('XXL', 96, 80, 102,  55),
      ('3XL',100, 84, 106,  56),
      ('4XL',104, 88, 110,  57)
  ) AS v2(sz_name, chest, waist, hip, length)
    ON sm2.name = v2.sz_name
) AS v(id, chest, waist, hip, length)
WHERE sc.name = 'Standard Indian Size Chart'
ON CONFLICT (size_chart_id, size_master_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15. Reload PostgREST schema cache
-- ---------------------------------------------------------------------------
SELECT pg_notify('pgrst', 'reload schema');
