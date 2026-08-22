-- 20260822020000_orders_derived_columns_for_admin_reads
-- -----------------------------------------------------
-- The admin dashboard lists no orders at all — not just Cashfree ones.
--
-- Root cause
--   ORDER_V2_SELECT (src/services/order-v2.service.ts) requests columns the
--   production orders table does not have. Verified directly:
--
--     ERROR: 42703: column "grand_total" does not exist
--
--   PostgREST rejects the whole select, so the list returns nothing for every
--   order. src/lib/order-mapper.ts reads the same flat columns.
--
--   Production's orders table is an earlier generation: it stores `total`,
--   `shipping` and a single `shipping_address` jsonb, whereas the codebase
--   expects `grand_total`, `shipping_fee` and flat shipping_* columns.
--
--   This was never going to self-correct: 20260706130000_orders_schema.sql
--   creates the canonical table with `create table if not exists`, and an
--   orders table already existed, so the migration ran, did nothing, and was
--   recorded as applied. Every later migration assumed the canonical shape.
--
-- Fix
--   Add the missing names as GENERATED ALWAYS ... STORED columns derived from
--   the columns production actually has. Chosen deliberately over editing the
--   read layer:
--
--     * Zero application changes, so the payment path stabilised today is not
--       touched at all.
--     * Fixes every reader at once (list, detail, invoices, exports), not just
--       the one query we happened to look at.
--     * Generated columns are not writable, so they cannot drift from source.
--       Verified nothing writes these names to orders: create_order_with_items
--       inserts total/shipping/shipping_address, and the `grand_total` keys in
--       application code are either the RPC's jsonb payload key or
--       pending_orders columns, neither of which is this table.
--
--   The shipping_address keys match what the checkout writes: name, phone,
--   email, line1, line2, city, state, postal_code, country.
--
-- Scope
--   Additive and reversible. No existing column, row, constraint or index is
--   modified, and no data is rewritten.
--
-- Follow-up
--   This makes production readable by code that expects the canonical schema;
--   it does not make production BE the canonical schema. Reconciling the two
--   for real — and repairing the migration history, where ~30 local migrations
--   are unrecorded and two remote entries have no local file — remains
--   outstanding and is the root of every incident seen today.

begin;

alter table public.orders
  add column if not exists grand_total numeric(12, 2)
    generated always as (total) stored,
  add column if not exists shipping_fee numeric(12, 2)
    generated always as (shipping) stored,
  add column if not exists shipping_name text
    generated always as (shipping_address ->> 'name') stored,
  add column if not exists shipping_phone text
    generated always as (shipping_address ->> 'phone') stored,
  add column if not exists shipping_email text
    generated always as (shipping_address ->> 'email') stored,
  add column if not exists shipping_address_line1 text
    generated always as (shipping_address ->> 'line1') stored,
  add column if not exists shipping_address_line2 text
    generated always as (shipping_address ->> 'line2') stored,
  add column if not exists shipping_city text
    generated always as (shipping_address ->> 'city') stored,
  add column if not exists shipping_state text
    generated always as (shipping_address ->> 'state') stored,
  add column if not exists shipping_postal_code text
    generated always as (shipping_address ->> 'postal_code') stored,
  add column if not exists shipping_country text
    generated always as (shipping_address ->> 'country') stored;

commit;
