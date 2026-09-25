-- Adds five dressy pieces (mirror work, sequins, bandhani, dupatta sets) to
-- the "Festive Edit" collection for Karwa Chauth and Diwali.
-- Only products with NO collection are touched, so a piece already in
-- Bestsellers / New Arrivals / Celebration Edit is never pulled out of it.
-- Idempotent. The final SELECT shows what each product ended up in.
UPDATE products
SET collection = 'Festive Edit', updated_at = now()
WHERE id IN (6, 7, 42, 62, 66)
  AND active = true
  AND (collection IS NULL OR btrim(collection) = '');

SELECT id, name, collection FROM products WHERE id IN (6, 7, 42, 62, 66) ORDER BY id;
