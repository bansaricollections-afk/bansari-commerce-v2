-- ₹300 off orders of ₹1,999 or more, advertised site-wide.
-- is_public = true is what puts it in the announcement bar; the bar reads it
-- live, so deactivating this row removes the offer everywhere with no deploy.
-- Idempotent: re-running updates the row rather than failing.
INSERT INTO coupons (code, description, discount_type, discount_value, min_order, active, is_public)
VALUES ('SAVE300', '₹300 off orders above ₹1,999', 'flat', 300, 1999, true, true)
ON CONFLICT (code) DO UPDATE
  SET description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      min_order = EXCLUDED.min_order,
      active = true,
      is_public = true,
      updated_at = now();
