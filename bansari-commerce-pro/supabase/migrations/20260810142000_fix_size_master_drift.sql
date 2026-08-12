-- Same schema-drift class as the two migrations before this one.
-- catalog.service.ts getSizes() selects `id, name, sort_order, active` from
-- size_master, but production has `label` (no `name`) and no `active` column
-- at all. Non-destructive: adds `name` (backfilled from `label`) and `active`
-- (defaulted to true, matching the app's existing default assumption for
-- untouched legacy rows). `label` and `sort_order` are left untouched.

alter table public.size_master add column if not exists name text;
alter table public.size_master add column if not exists active boolean not null default true;

update public.size_master
set name = label
where name is null and label is not null;
