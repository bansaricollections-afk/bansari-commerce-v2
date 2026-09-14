-- Fix: schedule cleanup_expired_pending_orders() for real.
--
-- WHY IT NEVER RAN
-- 20260716030000_pending_orders_cleanup.sql creates the function and then
-- tries to schedule it like this:
--
--   do $$
--   begin
--     perform cron.schedule(
--       'cleanup_expired_pending_orders',
--       '5 * * * *',
--       $$select public.cleanup_expired_pending_orders()$$   -- <-- here
--     );
--   exception when others then ...
--   end $$;
--
-- The inner $$ CLOSES the outer `do $$` block. Postgres sees a malformed
-- statement, and because that is a parse error rather than a runtime one, the
-- `exception when others` handler cannot catch it — the handler only runs for
-- errors raised while the block executes, and this block never compiles.
--
-- The function was created (it is the statement before), so everything looked
-- fine. But no schedule was ever inserted, and pending_orders has been growing
-- since July: rows that expired on 24 August were still present on 14
-- September, and the abandoned-cart screen was showing them as live checkouts.
--
-- The fix is a distinct dollar-quote tag for the nested literal.

create extension if not exists pg_cron;

-- Idempotent: drop any previous schedule before adding this one. Guarded so
-- re-running is safe when no job exists yet.
do $outer$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup_expired_pending_orders') then
    perform cron.unschedule('cleanup_expired_pending_orders');
  end if;
end
$outer$;

-- Every hour at :05. $cron$ — NOT $$ — so the literal cannot terminate the
-- block that contains it. This is the entire bug.
do $outer$
begin
  perform cron.schedule(
    'cleanup_expired_pending_orders',
    '5 * * * *',
    $cron$select public.cleanup_expired_pending_orders()$cron$
  );
end
$outer$;

-- ── Verification ───────────────────────────────────────────────────────────
-- Expect exactly one row: active = true, schedule = '5 * * * *'.
-- If this returns nothing, pg_cron is not enabled on the project — turn it on
-- under Database → Extensions in the Supabase dashboard, then re-run this file.
select jobid, jobname, schedule, active, command
  from cron.job
 where jobname = 'cleanup_expired_pending_orders';
