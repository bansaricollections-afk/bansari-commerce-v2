-- 20260826000000_restore_missing_audit_tables
-- -------------------------------------------
-- Creates public.order_audit_trail and public.admin_audit_log, which the
-- application has been writing to since launch but which do not exist in
-- production.
--
-- HOW THIS HAPPENED
--
-- Migration 20260716060000_order_audit_and_inventory_safety.sql declares both
-- tables, but was never applied to the remote database — it was one of ~37
-- migrations missing from the migration history table. Verified directly:
-- to_regclass('public.order_audit_trail') and ('public.admin_audit_log') both
-- return NULL.
--
-- WHY NOBODY NOTICED
--
-- Every call site writes and discards the result:
--
--     await supabase.from('order_audit_trail').insert([...]);
--
-- supabase-js RETURNS errors, it does not throw them, so a write to a
-- non-existent relation is indistinguishable from success at the call site.
-- Both tables are write-only — nothing in the codebase reads them — so no
-- screen ever rendered empty and no request ever failed. The result is that
-- the order audit trail and the admin action log have silently recorded
-- nothing, on a store that takes real payments.
--
-- WHY THIS IS A NEW MIGRATION RATHER THAN REPLAYING THE OLD ONE
--
-- 20260716060000 is idempotent and would work, but it does more than create
-- these tables: it also backfills pending_orders columns and, critically,
-- REPLACES decrement_product_stock. That function exists and works in
-- production today, and later migrations may have refined it. Replaying the
-- old file risks regressing live inventory logic to restore an audit table.
-- This migration therefore carries only the two missing tables.
--
-- The definitions below are copied verbatim from 20260716060000 so the two
-- files cannot disagree.
--
-- SAFETY
--
-- Additive only. Every statement is `if not exists` / `or replace`, so this is
-- safe to run repeatedly and cannot affect existing tables, columns or data.

-- =============================================================================
-- order_audit_trail — append-only log of order lifecycle events
-- =============================================================================
--
-- The CHECK list was verified against every value the code actually inserts:
-- 'created' and 'paid' from the order-creation paths, plus `event: status`
-- from /api/orders/status, where status is constrained to ORDER_STATUSES
-- ('placed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled') —
-- all nine values are already permitted here.
--
-- 'note_added' is deliberately absent: that event goes to order_timeline,
-- which is a different table and already exists.
create table if not exists public.order_audit_trail (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null,
  event       text        not null
    check (event in ('created', 'paid', 'cancelled', 'refunded', 'shipped', 'delivered', 'processing', 'packed', 'placed')),
  actor       text        not null default 'system',
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists order_audit_trail_order_id_idx
  on public.order_audit_trail (order_id, created_at);

-- Immutable log: UPDATE and DELETE are silently discarded rather than errored,
-- which is the original design. Note this means a mistaken row cannot be
-- removed through normal SQL.
create or replace rule order_audit_trail_no_update as
  on update to public.order_audit_trail do instead nothing;

create or replace rule order_audit_trail_no_delete as
  on delete to public.order_audit_trail do instead nothing;

alter table public.order_audit_trail enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'order_audit_trail'
      and policyname = 'order_audit_trail: no direct access'
  ) then
    create policy "order_audit_trail: no direct access"
      on public.order_audit_trail
      as restrictive
      for all
      using (false);
  end if;
end $$;


-- =============================================================================
-- admin_audit_log — append-only log of admin mutations
-- =============================================================================
--
-- Columns verified against every insert in the codebase: action, entity_type,
-- entity_id, user_id, metadata — no call site sends anything else.
create table if not exists public.admin_audit_log (
  id           uuid        primary key default gen_random_uuid(),
  action       text        not null,
  entity_type  text        not null,
  entity_id    text        not null,
  user_id      uuid,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity_type, entity_id, created_at);

create index if not exists admin_audit_log_user_idx
  on public.admin_audit_log (user_id, created_at);

create or replace rule admin_audit_log_no_update as
  on update to public.admin_audit_log do instead nothing;

create or replace rule admin_audit_log_no_delete as
  on delete to public.admin_audit_log do instead nothing;

alter table public.admin_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'admin_audit_log'
      and policyname = 'admin_audit_log: no direct access'
  ) then
    create policy "admin_audit_log: no direct access"
      on public.admin_audit_log
      as restrictive
      for all
      using (false);
  end if;
end $$;
