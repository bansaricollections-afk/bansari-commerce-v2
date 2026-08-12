-- Atomic increment for products.view_count, called from the PDP page on
-- each load. A plain SQL function avoids a read-then-write race between
-- concurrent visitors that a client-side read+update would have.

create or replace function public.increment_product_view(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set view_count = view_count + 1 where id = p_id;
$$;

grant execute on function public.increment_product_view(bigint) to service_role;
