-- ============================================================================
-- Defect fix: set_variant_stock wrote an invalid inventory_transactions
--             movement_type, so every admin stock save failed.
-- ============================================================================
-- 20260812120000 introduced set_variant_stock with movement_type 'adjustment'.
-- inventory_transactions (20260719) constrains that column to:
--   reservation, release, sale, return, refund, manual_adjustment,
--   damage, lost, capture
-- so the audit insert raised:
--   new row for relation "inventory_transactions" violates check constraint
--   "inventory_transactions_movement_type_check"
--
-- The variant row is created before the RPC runs, so a failed save left the
-- product size-managed with a single 0-stock size (sold out on the storefront)
-- until the real quantity could be saved.
--
-- ONLY CHANGE: 'adjustment' -> 'manual_adjustment'.
-- Signature, SECURITY DEFINER, search_path pin, FOR UPDATE row lock, the
-- reserved-stock guard and the service_role-only grant are all unchanged.
--
-- No schema change. No data change. No inventory quantity is written here.
-- ============================================================================

create or replace function public.set_variant_stock(
  p_variant_id bigint,
  p_stock      integer,
  p_actor_id   uuid  default null,
  p_actor_name text  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock    integer;
  v_reserved integer;
begin
  if p_stock < 0 then
    raise exception 'Stock cannot be negative.' using errcode = 'P0001';
  end if;

  select stock, reserved_stock
    into v_stock, v_reserved
    from public.product_variants
   where id = p_variant_id
     for update;

  if not found then
    raise exception 'Variant % does not exist.', p_variant_id using errcode = 'P0001';
  end if;

  if p_stock < v_reserved then
    raise exception
      'Stock (%) cannot be lower than the % unit(s) already reserved.', p_stock, v_reserved
      using errcode = 'P0002';
  end if;

  if p_stock = v_stock then
    return;
  end if;

  update public.product_variants
     set stock = p_stock, updated_at = now()
   where id = p_variant_id;

  insert into public.inventory_transactions (
    variant_id, movement_type, quantity,
    previous_stock, new_stock, previous_reserved, new_reserved,
    actor_id, actor_name, reason
  )
  values (
    p_variant_id, 'manual_adjustment', p_stock - v_stock,
    v_stock, p_stock, v_reserved, v_reserved,
    p_actor_id, p_actor_name, 'admin_stock_set'
  );
end;
$$;

revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from public;
revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from anon;
revoke all    on function public.set_variant_stock(bigint, integer, uuid, text) from authenticated;
grant  execute on function public.set_variant_stock(bigint, integer, uuid, text) to service_role;
