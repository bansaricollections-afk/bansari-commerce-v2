-- Same schema-drift class as the migrations before this one.
-- catalog.service.ts getCollections() selects `banner_url`, production has
-- `image_url`. Non-destructive: adds `banner_url` (backfilled from
-- `image_url`), does not touch `image_url`.

alter table public.collections add column if not exists banner_url text;

update public.collections
set banner_url = image_url
where banner_url is null and image_url is not null;
