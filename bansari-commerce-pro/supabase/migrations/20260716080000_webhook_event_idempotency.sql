-- =============================================================================
-- Migration: 20260716080000_webhook_event_idempotency.sql
-- Purpose  : Exactly-once webhook event processing via Razorpay event_id
--            deduplication. INSERT with ON CONFLICT DO NOTHING ensures the
--            business logic only runs once per Razorpay event delivery.
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        text        NOT NULL,
  event_type      text        NOT NULL,
  payment_id      text,
  processed_at    timestamptz NOT NULL DEFAULT now(),
  result          jsonb
);

COMMENT ON TABLE webhook_events IS
  'Idempotency log for Razorpay webhook events. '
  'A unique index on event_id guarantees exactly-once processing: '
  'the handler INSERTs with ON CONFLICT DO NOTHING and skips processing '
  'if the row already existed (duplicate delivery).';

-- Unique index: duplicate INSERT returns 23505, which the handler catches.
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_event_id_udx
  ON webhook_events (event_id);

-- Operational index: look up all events for a given payment_id.
CREATE INDEX IF NOT EXISTS webhook_events_payment_id_idx
  ON webhook_events (payment_id)
  WHERE payment_id IS NOT NULL;

-- Time-range index: operational monitoring queries.
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON webhook_events (processed_at DESC);

-- RLS: deny all access to anon and authenticated roles.
-- Only the service-role key (used by server-side API routes) may write.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_deny_all"
  ON webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Immutable: processed events must never be modified or deleted.
-- Provides a tamper-evident audit trail for payment processing.
CREATE OR REPLACE RULE webhook_events_no_update
  AS ON UPDATE TO webhook_events
  DO INSTEAD NOTHING;

CREATE OR REPLACE RULE webhook_events_no_delete
  AS ON DELETE TO webhook_events
  DO INSTEAD NOTHING;
