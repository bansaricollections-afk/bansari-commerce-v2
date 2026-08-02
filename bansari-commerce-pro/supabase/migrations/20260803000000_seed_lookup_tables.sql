-- ============================================================
-- SEED: LOOKUP TABLES
-- 20260803000000_seed_lookup_tables.sql
--
-- Source of truth: LIVE DATABASE SCHEMA (provided directly)
--
-- Column lists verified against live schema:
--
--   categories   : name, slug, description, image_url, active, sort_order
--   subcategories: category_id, name, slug, description, image_url, active
--   collections  : name, slug, description, image_url, active, featured, sort_order
--   attr_color   : name, slug, hex_code, active, sort_order
--   attr_fabric  : name, slug, active, sort_order
--   attr_occasion: name, slug, active, sort_order
--   attr_pattern : name, slug, active, sort_order
--   attr_fit     : name, slug, active, sort_order
--   attr_sleeve  : name, slug, active, sort_order
--   attr_neck    : name, slug, active, sort_order
--   attr_work    : name, slug, active, sort_order
--   attr_length  : name, slug, active, sort_order
--   size_master  : label, sort_order
--   size_charts  : name, description, chart_data
--
-- Safety: every INSERT uses ON CONFLICT DO NOTHING so this
-- migration is safe to run more than once.
-- ============================================================

-- ============================================================
-- categories
-- Live columns: name, slug, description, image_url, active, sort_order
-- ============================================================
insert into public.categories (name, slug, description, image_url, active, sort_order)
values
  ('Sarees',      'sarees',      'Traditional and contemporary sarees', null, true, 1),
  ('Suits',       'suits',       'Salwar suits and dress materials',    null, true, 2),
  ('Lehengas',    'lehengas',    'Bridal and party lehengas',           null, true, 3),
  ('Kurtis',      'kurtis',      'Casual and ethnic kurtis',            null, true, 4),
  ('Accessories', 'accessories', 'Jewellery and fashion accessories',   null, true, 5),
  ('Dupattas',    'dupattas',    'Dupattas and stoles',                 null, true, 6)
on conflict (slug) do nothing;

-- ============================================================
-- subcategories
-- Live columns: category_id, name, slug, description, image_url, active
-- NOT present in live: sort_order
-- ============================================================
insert into public.subcategories (category_id, name, slug, description, image_url, active)
select c.id, v.name, v.slug, v.description, null::text, true
from (values
  ('sarees',   'Silk Sarees',        'silk-sarees',        'Pure and art silk sarees'),
  ('sarees',   'Cotton Sarees',      'cotton-sarees',      'Handloom and printed cotton'),
  ('sarees',   'Georgette Sarees',   'georgette-sarees',   'Party and casual georgette'),
  ('sarees',   'Banarasi Sarees',    'banarasi-sarees',    'Authentic Banarasi weaves'),
  ('suits',    'Salwar Kameez',      'salwar-kameez',      'Stitched and unstitched suits'),
  ('suits',    'Anarkali Suits',     'anarkali-suits',     'Flared anarkali style suits'),
  ('suits',    'Patiala Suits',      'patiala-suits',      'Traditional Patiala style'),
  ('lehengas', 'Bridal Lehengas',    'bridal-lehengas',    'Heavy bridal lehengas'),
  ('lehengas', 'Party Lehengas',     'party-lehengas',     'Semi-formal party wear lehengas'),
  ('lehengas', 'Designer Lehengas',  'designer-lehengas',  'Contemporary designer lehengas'),
  ('kurtis',   'Casual Kurtis',      'casual-kurtis',      'Everyday casual kurtis'),
  ('kurtis',   'Festive Kurtis',     'festive-kurtis',     'Festive and occasion kurtis'),
  ('kurtis',   'Printed Kurtis',     'printed-kurtis',     'Block and digital print kurtis')
) as v(cat_slug, name, slug, description)
join public.categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ============================================================
-- collections
-- Live columns: name, slug, description, image_url, active, featured, sort_order
-- ============================================================
insert into public.collections (name, slug, description, image_url, active, featured, sort_order)
values
  ('New Arrivals',      'new-arrivals',      'Latest additions to our catalogue', null, true, true,  1),
  ('Bestsellers',       'bestsellers',       'Most popular picks',                null, true, true,  2),
  ('Festive Edit',      'festive-edit',      'Curated for festive occasions',     null, true, true,  3),
  ('Bridal Collection', 'bridal-collection', 'Exclusive bridal looks',            null, true, false, 4),
  ('Summer Refresh',    'summer-refresh',    'Light and breezy summer styles',    null, true, false, 5),
  ('Sale',              'sale',              'Special offers and discounts',      null, true, false, 6)
on conflict (slug) do nothing;

-- ============================================================
-- attr_color
-- Live columns: name, slug, hex_code, active, sort_order
-- ============================================================
insert into public.attr_color (name, slug, hex_code, active, sort_order)
values
  ('Red',       'red',       '#FF0000', true,  1),
  ('Blue',      'blue',      '#0000FF', true,  2),
  ('Green',     'green',     '#008000', true,  3),
  ('Yellow',    'yellow',    '#FFFF00', true,  4),
  ('Pink',      'pink',      '#FFC0CB', true,  5),
  ('Orange',    'orange',    '#FFA500', true,  6),
  ('Purple',    'purple',    '#800080', true,  7),
  ('White',     'white',     '#FFFFFF', true,  8),
  ('Black',     'black',     '#000000', true,  9),
  ('Gold',      'gold',      '#FFD700', true, 10),
  ('Silver',    'silver',    '#C0C0C0', true, 11),
  ('Maroon',    'maroon',    '#800000', true, 12),
  ('Navy Blue', 'navy-blue', '#000080', true, 13),
  ('Beige',     'beige',     '#F5F5DC', true, 14),
  ('Grey',      'grey',      '#808080', true, 15),
  ('Cream',     'cream',     '#FFFDD0', true, 16),
  ('Mustard',   'mustard',   '#FFDB58', true, 17),
  ('Teal',      'teal',      '#008080', true, 18),
  ('Peach',     'peach',     '#FFDAB9', true, 19),
  ('Lavender',  'lavender',  '#E6E6FA', true, 20)
on conflict (slug) do nothing;

-- ============================================================
-- attr_fabric
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_fabric (name, slug, active, sort_order)
values
  ('Silk',          'silk',          true,  1),
  ('Cotton',        'cotton',        true,  2),
  ('Georgette',     'georgette',     true,  3),
  ('Chiffon',       'chiffon',       true,  4),
  ('Crepe',         'crepe',         true,  5),
  ('Velvet',        'velvet',        true,  6),
  ('Net',           'net',           true,  7),
  ('Linen',         'linen',         true,  8),
  ('Rayon',         'rayon',         true,  9),
  ('Polyester',     'polyester',     true, 10),
  ('Art Silk',      'art-silk',      true, 11),
  ('Banarasi Silk', 'banarasi-silk', true, 12),
  ('Pure Silk',     'pure-silk',     true, 13),
  ('Chanderi',      'chanderi',      true, 14),
  ('Tussar Silk',   'tussar-silk',   true, 15)
on conflict (slug) do nothing;

-- ============================================================
-- attr_occasion
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_occasion (name, slug, active, sort_order)
values
  ('Casual',    'casual',    true, 1),
  ('Festive',   'festive',   true, 2),
  ('Wedding',   'wedding',   true, 3),
  ('Party',     'party',     true, 4),
  ('Office',    'office',    true, 5),
  ('Religious', 'religious', true, 6),
  ('Bridal',    'bridal',    true, 7),
  ('Reception', 'reception', true, 8)
on conflict (slug) do nothing;

-- ============================================================
-- attr_pattern
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_pattern (name, slug, active, sort_order)
values
  ('Solid',         'solid',         true,  1),
  ('Printed',       'printed',       true,  2),
  ('Embroidered',   'embroidered',   true,  3),
  ('Woven',         'woven',         true,  4),
  ('Block Print',   'block-print',   true,  5),
  ('Digital Print', 'digital-print', true,  6),
  ('Floral',        'floral',        true,  7),
  ('Geometric',     'geometric',     true,  8),
  ('Abstract',      'abstract',      true,  9),
  ('Bandhani',      'bandhani',      true, 10),
  ('Ikat',          'ikat',          true, 11),
  ('Checks',        'checks',        true, 12)
on conflict (slug) do nothing;

-- ============================================================
-- attr_fit
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_fit (name, slug, active, sort_order)
values
  ('Regular',  'regular',  true, 1),
  ('Slim',     'slim',     true, 2),
  ('Relaxed',  'relaxed',  true, 3),
  ('Straight', 'straight', true, 4),
  ('A-Line',   'a-line',   true, 5),
  ('Flared',   'flared',   true, 6),
  ('Fitted',   'fitted',   true, 7)
on conflict (slug) do nothing;

-- ============================================================
-- attr_sleeve
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_sleeve (name, slug, active, sort_order)
values
  ('Sleeveless',    'sleeveless',    true, 1),
  ('Short Sleeve',  'short-sleeve',  true, 2),
  ('3/4 Sleeve',    '3-4-sleeve',    true, 3),
  ('Full Sleeve',   'full-sleeve',   true, 4),
  ('Bell Sleeve',   'bell-sleeve',   true, 5),
  ('Cap Sleeve',    'cap-sleeve',    true, 6),
  ('Cold Shoulder', 'cold-shoulder', true, 7)
on conflict (slug) do nothing;

-- ============================================================
-- attr_neck
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_neck (name, slug, active, sort_order)
values
  ('Round Neck',   'round-neck',   true, 1),
  ('V-Neck',       'v-neck',       true, 2),
  ('Boat Neck',    'boat-neck',    true, 3),
  ('Collar Neck',  'collar-neck',  true, 4),
  ('Sweetheart',   'sweetheart',   true, 5),
  ('Square Neck',  'square-neck',  true, 6),
  ('High Neck',    'high-neck',    true, 7),
  ('Mandarin',     'mandarin',     true, 8),
  ('Off Shoulder', 'off-shoulder', true, 9)
on conflict (slug) do nothing;

-- ============================================================
-- attr_work
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_work (name, slug, active, sort_order)
values
  ('Plain',        'plain',        true,  1),
  ('Embroidered',  'embroidered',  true,  2),
  ('Zari',         'zari',         true,  3),
  ('Sequin',       'sequin',       true,  4),
  ('Mirror Work',  'mirror-work',  true,  5),
  ('Beadwork',     'beadwork',     true,  6),
  ('Hand Painted', 'hand-painted', true,  7),
  ('Cutwork',      'cutwork',      true,  8),
  ('Applique',     'applique',     true,  9),
  ('Resham',       'resham',       true, 10),
  ('Zardozi',      'zardozi',      true, 11)
on conflict (slug) do nothing;

-- ============================================================
-- attr_length
-- Live columns: name, slug, active, sort_order
-- ============================================================
insert into public.attr_length (name, slug, active, sort_order)
values
  ('Mini',       'mini',       true, 1),
  ('Knee',       'knee',       true, 2),
  ('Midi',       'midi',       true, 3),
  ('Maxi',       'maxi',       true, 4),
  ('Ankle',      'ankle',      true, 5),
  ('Floor',      'floor',      true, 6),
  ('Above Knee', 'above-knee', true, 7)
on conflict (slug) do nothing;

-- ============================================================
-- size_master
-- Live columns: label, sort_order
-- ============================================================
insert into public.size_master (label, sort_order)
values
  ('XS',   1),
  ('S',    2),
  ('M',    3),
  ('L',    4),
  ('XL',   5),
  ('XXL',  6),
  ('3XL',  7),
  ('4XL',  8),
  ('Free', 9)
on conflict (label) do nothing;

-- ============================================================
-- size_charts
-- Live columns: name, description, chart_data
-- ============================================================
insert into public.size_charts (name, description, chart_data)
values
  (
    'Standard Women Apparel',
    'Standard size chart for women''s ethnic and fusion wear',
    '{"headers":["Size","Chest (in)","Waist (in)","Hip (in)","Length (in)"],"rows":[["XS","32","26","35","52"],["S","34","28","37","53"],["M","36","30","39","54"],["L","38","32","41","55"],["XL","40","34","43","56"],["XXL","42","36","45","57"],["3XL","44","38","47","58"]]}'::jsonb
  ),
  (
    'Saree Blouse',
    'Blouse size chart for sarees',
    '{"headers":["Size","Bust (in)","Waist (in)"],"rows":[["32","32","26"],["34","34","28"],["36","36","30"],["38","38","32"],["40","40","34"],["42","42","36"]]}'::jsonb
  )
on conflict (name) do nothing;
