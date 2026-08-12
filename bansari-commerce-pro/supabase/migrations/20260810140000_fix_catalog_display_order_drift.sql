-- Fix schema drift: production catalog/lookup tables were provisioned with
-- `sort_order`, but the application (src/services/catalog.service.ts,
-- consumed by GET /api/admin/catalog) selects and orders by `display_order`
-- on these same tables. This breaks the entire Admin Product classification
-- UI (Category, Subcategory, Collection, and all attr_* dropdowns) with:
--   "column attr_neck.display_order does not exist"
--
-- Root cause: repo migrations from 20260718100000 onward were never applied
-- to production as tracked migrations (confirmed via `supabase migration
-- list --linked`, remote="" for all of them); production's actual schema
-- was provisioned separately using `sort_order` naming.
--
-- Fix: add the missing `display_order` column (idempotent, non-destructive)
-- to every table the application actually queries it on, backfilled from
-- the existing `sort_order` value so current ordering is preserved. Neither
-- `sort_order` nor any other column, table, RLS policy, or index is touched.

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'subcategories', 'collections',
    'attr_fabric', 'attr_color', 'attr_occasion', 'attr_pattern',
    'attr_fit', 'attr_sleeve', 'attr_neck', 'attr_work', 'attr_length'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I add column if not exists display_order integer not null default 0', t);
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'sort_order'
      ) then
        -- Backfill only rows still at the just-added default, so this is safe to re-run
        -- and never clobbers a display_order value set intentionally after this migration.
        execute format(
          'update public.%I set display_order = sort_order where display_order = 0 and sort_order <> 0',
          t
        );
      end if;
    end if;
  end loop;
end $$;
