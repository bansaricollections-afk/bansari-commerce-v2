-- Back-in-stock requests: a shopper leaves an email for a sold-out size.
-- Written only by the server (service role) through /api/stock-alerts; RLS is
-- on with no policies, so the public anon key can neither read nor write it.
CREATE TABLE IF NOT EXISTS stock_alerts (
  id          bigserial PRIMARY KEY,
  product_id  bigint      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  bigint      REFERENCES product_variants(id) ON DELETE SET NULL,
  size_label  text,
  email       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);

-- One request per email per product+size; a repeat submit is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS stock_alerts_unique
  ON stock_alerts (product_id, COALESCE(variant_id, 0), lower(email));

CREATE INDEX IF NOT EXISTS stock_alerts_open
  ON stock_alerts (product_id) WHERE notified_at IS NULL;

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
