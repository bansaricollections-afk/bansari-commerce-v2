-- 20260823010000_marketing_attribution
-- ------------------------------------
-- Phase 1 of the performance-marketing setup: give the server the two things
-- it needs to report conversions accurately to ad platforms.
--
-- 1. pending_orders.marketing_json / orders.marketing_json
--
--    The Meta Conversions API matches a server-side Purchase to the ad click
--    that caused it using the `_fbc` (click id) and `_fbp` (browser id)
--    first-party cookies. Those cookies only exist in the BROWSER, and the
--    only request where the browser, the cart and the customer are all present
--    at once is create-order. By the time the payment is confirmed — which can
--    be a Cashfree webhook with no browser involved at all — the cookies are
--    long gone.
--
--    So attribution is captured at create-order time onto the in-flight
--    snapshot, then copied onto the order when it is persisted. Storing it on
--    `orders` as well is what makes it possible to reconcile a platform's
--    reported ROAS against Supabase, which is impossible today.
--
--    jsonb rather than a column per field: the set of parameters ad platforms
--    want changes (gclid, wbraid, gbraid, ttclid, msclkid...) and each addition
--    would otherwise be a migration.
--
-- 2. orders.capi_sent_at
--
--    The Cashfree persist path is deliberately re-entrant — browser verify and
--    webhook both call it and race. Order creation is guarded by unique
--    indexes, but a side effect like "send a Purchase to Meta" has no such
--    guard. Without a marker, a webhook retry inflates reported revenue.
--    Setting this column with a conditional UPDATE makes the send at-most-once.
--
-- Additive and reversible: no existing column, constraint or row is modified,
-- and every new column is nullable with no default, so existing rows and every
-- current INSERT (including create_order_with_items) keep working untouched.

alter table public.pending_orders
  add column if not exists marketing_json jsonb;

alter table public.orders
  add column if not exists marketing_json jsonb;

alter table public.orders
  add column if not exists capi_sent_at timestamptz;

comment on column public.pending_orders.marketing_json is
  'Ad-attribution snapshot captured from the browser at create-order time: _fbp/_fbc cookies, click ids and first/last-touch UTMs. Copied to orders.marketing_json on persist.';

comment on column public.orders.marketing_json is
  'Ad-attribution snapshot copied from pending_orders. Used to reconcile platform-reported ROAS against actual orders.';

comment on column public.orders.capi_sent_at is
  'Set when a server-side Purchase has been reported to the Meta Conversions API. Guards the at-most-once send across browser-verify / webhook races and webhook retries.';

-- Reporting queries filter on "paid orders that came from an ad", so index the
-- attribution presence rather than the whole document.
create index if not exists orders_marketing_json_idx
  on public.orders using gin (marketing_json)
  where marketing_json is not null;
