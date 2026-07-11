-- Sprint 3: Order lifecycle email integration
--
-- 1. Extends order_status to include out_for_delivery, so the existing
--    OutForDeliveryEmail template can be wired into a real status
--    transition rather than remaining unused.
-- 2. Creates email_delivery_log as the durable record of every attempted
--    lifecycle email, and as the atomic reservation mechanism that
--    prevents duplicate sends under concurrent requests.
--
-- Reservation protocol (implemented in src/services/email.service.ts):
--
--   Step 1 — upsert with ignoreDuplicates=true:
--     PostgREST emits:
--       INSERT INTO email_delivery_log (...)
--       ON CONFLICT (order_id, event, recipient_email) DO NOTHING
--       RETURNING id;
--     If one row returned → this process owns the reservation.
--
--   Step 2 — if no row returned (conflict exists):
--     UPDATE email_delivery_log
--     SET status = 'pending',
--         error_message = NULL,
--         provider_message_id = NULL,
--         sent_at = NULL
--     WHERE order_id = $1
--       AND event = $2
--       AND recipient_email = $3
--       AND status = 'failed'
--     RETURNING id;
--     If one row returned → this process owns the retry.
--     If zero rows returned → another process owns it (sent/pending/claimed).
--
-- provider is NULL during reservation; populated only after successful send.
-- Failed rows are reusable via Step 2; sent and pending rows are not.

-- ---------------------------------------------------------------------
-- 1. Extend order_status check constraint
-- ---------------------------------------------------------------------
-- Drops and recreates the CHECK constraint to add 'out_for_delivery'.
-- ORDER_STATUSES in order.service.ts is updated in the same commit.

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'placed',
    'processing',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ));

-- ---------------------------------------------------------------------
-- 2. email_delivery_log
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_delivery_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Constrained to exactly the five lifecycle events the application knows
  -- about. Adding a new event type requires a migration, keeping DB and
  -- code in sync.
  event               TEXT        NOT NULL CHECK (event IN (
                                    'order_confirmed',
                                    'payment_successful',
                                    'order_shipped',
                                    'out_for_delivery',
                                    'order_delivered'
                                  )),

  recipient_email     TEXT        NOT NULL,

  provider            TEXT,                  -- NULL until send succeeds
  provider_message_id TEXT,                  -- NULL until send succeeds

  status              TEXT        NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error_message       TEXT,

  template_version    TEXT        NOT NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ,

  -- The reservation key. The upsert in Step 1 conflicts on this.
  UNIQUE (order_id, event, recipient_email)
);

COMMENT ON TABLE email_delivery_log IS
  'Durable log of every transactional email attempt. The UNIQUE constraint '
  'on (order_id, event, recipient_email) is the atomic reservation key that '
  'prevents duplicate sends under concurrent requests.';

COMMENT ON COLUMN email_delivery_log.provider IS
  'NULL during reservation and on failure. Populated (resend) only after a '
  'successful provider interaction.';

COMMENT ON COLUMN email_delivery_log.event IS
  'The lifecycle event that triggered this email. Constrained to the five '
  'events defined in email.service.ts EMAIL_EVENT_REGISTRY. Extend the CHECK '
  'constraint here and add an entry to the registry to add a new event.';

-- Supports the Step 2 conditional UPDATE (WHERE order_id, event,
-- recipient_email, status) and the upsert conflict target lookup.
CREATE INDEX IF NOT EXISTS email_delivery_log_reservation_idx
  ON email_delivery_log (order_id, event, recipient_email, status);

-- Supports admin queries by status (e.g. finding all failed deliveries).
CREATE INDEX IF NOT EXISTS email_delivery_log_status_idx
  ON email_delivery_log (status);
