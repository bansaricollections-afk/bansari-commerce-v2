-- Standard size charts per garment style, and a first assignment for every
-- product that has none. Idempotent: re-running updates the charts and only
-- ever fills products whose size_chart_id is still empty, so a chart the owner
-- picked in Admin is never overwritten.
--
-- chart_data rows are BODY measurements in inches — the body each size fits,
-- which is standard Indian women's ethnic sizing — not garment measurements.
-- The description carries the typical garment length and how to choose.

WITH body AS (
  SELECT '[
    {"size":"XS","bust":32,"waist":26,"hip":36},
    {"size":"S","bust":34,"waist":28,"hip":38},
    {"size":"M","bust":36,"waist":30,"hip":40},
    {"size":"L","bust":38,"waist":32,"hip":42},
    {"size":"XL","bust":40,"waist":34,"hip":44},
    {"size":"XXL","bust":42,"waist":36,"hip":46},
    {"size":"3XL","bust":44,"waist":38,"hip":48},
    {"size":"4XL","bust":46,"waist":40,"hip":50},
    {"size":"5XL","bust":48,"waist":42,"hip":52}
  ]'::jsonb AS rows
)
INSERT INTO size_charts (name, description, chart_data)
SELECT c.name, c.description, body.rows
FROM body, (VALUES
  ('Anarkali Kurta',
   'Typical length: 46–50 in, calf to ankle. Fitted at the bust and flared from just below it, so choose by your bust.'),
  ('A-Line Kurta',
   'Typical length: 42–46 in, knee to just below the knee. Fitted through the shoulder and bust and flared from the waist, so choose by your bust; the hip is forgiving.'),
  ('Straight Kurta',
   'Typical length: 42–46 in, knee to just below the knee. Straight through the hip, so choose by whichever is larger, your bust or your hip.'),
  ('Short Kurti / Top',
   'Typical length: 26–34 in, around the hip. Choose by your bust.'),
  ('Crop Top',
   'Typical length: 14–18 in, ending at the waist. Fitted at the bust and waist; if you are between sizes, size up.'),
  ('Dress',
   'Length varies by style — see the product photos. Choose by your bust and waist, whichever is larger.'),
  ('Co-ord Set',
   'Top typically 26–38 in. Choose the top by your bust and the bottom by your hip; if they differ, size to the larger.')
) AS c(name, description)
ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      chart_data  = EXCLUDED.chart_data,
      updated_at  = now();

-- First assignment, most specific rule first. Only empty ones are filled.
UPDATE products p
SET size_chart_id = sc.id, updated_at = now()
FROM size_charts sc
WHERE p.size_chart_id IS NULL
  AND sc.name = CASE
    WHEN p.name ~* 'anarkali'                         THEN 'Anarkali Kurta'
    WHEN p.name ~* 'crop'                             THEN 'Crop Top'
    WHEN p.category ~* 'dress' OR p.name ~* '\mdress' THEN 'Dress'
    WHEN p.name ~* 'a-line|a line|flared'             THEN 'A-Line Kurta'
    WHEN p.category ~* 'co-?ord'                      THEN 'Co-ord Set'
    WHEN p.category ~* 'top|kurti|shirt'
      OR p.name ~* 'shirt|short kurti|\mtop\M'        THEN 'Short Kurti / Top'
    WHEN p.category ~* 'kurta|suit'                   THEN 'Straight Kurta'
  END;

-- What each product ended up with — check this list.
SELECT p.id, left(p.name, 60) AS product, p.category, sc.name AS size_chart
FROM products p LEFT JOIN size_charts sc ON sc.id = p.size_chart_id
WHERE p.active
ORDER BY sc.name NULLS FIRST, p.id;
