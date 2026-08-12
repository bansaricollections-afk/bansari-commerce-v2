-- Same schema-drift class as 20260810140000: catalog.service.ts (getAttributeOptions)
-- selects `hex` on attr_color, but production has `hex_code`. Discovered only after
-- the display_order fix let the catalog query reach this table's remaining columns.
-- Non-destructive: adds `hex` (backfilled from `hex_code`), does not touch hex_code.

alter table public.attr_color add column if not exists hex text;

update public.attr_color
set hex = hex_code
where hex is null and hex_code is not null;
