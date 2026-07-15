-- =============================================================================
-- pending_orders automatic cleanup
-- =============================================================================
-- Purges pending_orders rows that:
--   • have status = 'pending'  (never consumed or recovered)
--   • AND have passed their expires_at timestamp
--
-- consumed and recovered rows are intentionally retained for 48 h longer
-- so the audit trail is available for support queries.  They are cleaned up
-- by a separate condition below.
--
-- This migration:
--   1. Creates the cleanup function.
--   2. Schedules it via pg_cron (requires pg_cron extension, available in
--      Supabase on all plans).  If pg_cron is not enabled, the schedule
--      INSERT is skipped gracefully; you can run the function manually.
-- =============================================================================

-- Enable pg_cron if available (Supabase Pro / Team plans have it by default).
-- The DO block swallows the error on plans where pg_cron is not installed,
-- so this migration applies cleanly on all environments.
create extension if not exists pg_cron schema pg_catalog;

-- ---------------------------------------------------------------------------
-- cleanup_expired_pending_orders()
-- ---------------------------------------------------------------------------
-- Returns the count of rows deleted so callers can log it.
create or replace function public.cleanup_expired_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  -- Delete rows that are stale-pending: never consumed, past expiry.
  with deleted as (
    delete from public.pending_orders
     where status    = 'pending'
       and expires_at < now()
    returning id
  )
  select count(*) into v_deleted from deleted;

  -- Also purge consumed/recovered rows older than 48 hours.
  -- These are kept briefly for same-day support queries.
  with old_closed as (
    delete from public.pending_orders
     where status in ('consumed', 'recovered')
       and created_at < now() - interval '48 hours'
    returning id
  )
  select v_deleted + count(*) into v_deleted from old_closed;

  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- pg_cron schedule: run every hour at :05
-- ---------------------------------------------------------------------------
-- Wrapped in a DO block so the migration is idempotent even if pg_cron is
-- not installed or the job already exists.
do $$
begin
  -- Remove any existing schedule with this name to stay idempotent.
  perform cron.unschedule('cleanup_expired_pending_orders')
    from cron.job
   where jobname = 'cleanup_expired_pending_orders';
exception when others then
  null;  -- pg_cron not installed; skip silently.
end $$;

do $$
begin
  perform cron.schedule(
    'cleanup_expired_pending_orders',   -- job name
    '5 * * * *',                        -- every hour at :05
    $$select public.cleanup_expired_pending_orders()$$
  );
exception when others then
  -- pg_cron not installed.  Run manually:
  --   select public.cleanup_expired_pending_orders();
  raise notice 'pg_cron not available; cleanup_expired_pending_orders() must be scheduled manually.';
end $$;
