-- 20260823000000_coupon_redemption_support
-- ----------------------------------------
-- Completes the coupon feature end to end.
--
-- Until now the coupons table, admin CRUD and admin UI all existed, but the
-- customer side was never connected: there was no coupon field in cart or
-- checkout, and BOTH payment routes hardcoded `const discount = 0`. An admin
-- could create a code that no customer could ever redeem.
--
-- Two things are needed to close that loop:
--
-- 1. pending_orders.coupon_code
--    pending_orders is the server-authoritative snapshot of an in-flight
--    checkout, and the persist path builds the final order from it. Without a
--    column here the code applied at create-order time is lost before the order
--    row is written, so orders.coupon_code (which already exists) could never
--    be populated and redemptions could not be counted.
--
-- 2. increment_coupon_uses()
--    Redemption must be an atomic UPDATE, not read-modify-write. Two customers
--    redeeming the last remaining use of a max_uses coupon at the same moment
--    would both read the same stale uses_count and both succeed, taking the
--    coupon over its limit. `uses_count = uses_count + 1` inside a single
--    statement makes that race impossible.
--
--    SECURITY DEFINER with a pinned search_path so it cannot be hijacked by a
--    caller-controlled path, and EXECUTE is granted to no one by default —
--    only the service-role key (used server-side) can call it.
--
-- Additive and reversible: no existing column, constraint or row is modified.

begin;

alter table public.pending_orders
  add column if not exists coupon_code text;

create or replace function public.increment_coupon_uses(p_code text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.coupons
     set uses_count = uses_count + 1,
         updated_at = now()
   where upper(code) = upper(p_code);
$$;

revoke all on function public.increment_coupon_uses(text) from public;
revoke all on function public.increment_coupon_uses(text) from anon;
revoke all on function public.increment_coupon_uses(text) from authenticated;

commit;
