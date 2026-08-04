-- ============================================================
-- Homepage Campaign Management System
-- Migration: 20260805_homepage_campaigns
-- ============================================================

create table if not exists public.homepage_campaigns (
  id               uuid primary key default gen_random_uuid(),
  title            text        not null,
  headline_line1   text        not null default '',
  headline_highlight text      not null default '',
  headline_line2   text        not null default '',
  description      text        not null default '',
  cta_primary_text text        not null default '',
  cta_primary_link text        not null default '/',
  cta_secondary_text text      not null default '',
  cta_secondary_link text      not null default '',
  desktop_image    text        not null default '',
  tablet_image     text        not null default '',
  mobile_image     text        not null default '',
  video_url        text,
  image_alt        text        not null default '',
  overlay_color    text        not null default '#000000',
  overlay_opacity  numeric(4,3) not null default 0 check (overlay_opacity >= 0 and overlay_opacity <= 1),
  text_alignment   text        not null default 'left' check (text_alignment in ('left','center','right')),
  image_position   text        not null default 'center' check (image_position in ('left','center','right','top','bottom')),
  button_style     text        not null default 'mauve' check (button_style in ('mauve','ivory','dark','outline')),
  sort_order       integer     not null default 0,
  status           text        not null default 'draft' check (status in ('draft','published','scheduled','archived')),
  start_date       timestamptz,
  end_date         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists homepage_campaigns_updated_at on public.homepage_campaigns;
create trigger homepage_campaigns_updated_at
  before update on public.homepage_campaigns
  for each row execute procedure public.set_updated_at();

-- Index for ordered public fetching
create index if not exists homepage_campaigns_status_sort
  on public.homepage_campaigns (status, sort_order);

-- RLS
alter table public.homepage_campaigns enable row level security;

-- Public: read published campaigns only
create policy "public_read_published_campaigns"
  on public.homepage_campaigns for select
  using (status = 'published');

-- Service role: full access (admin)
create policy "service_role_full_access"
  on public.homepage_campaigns for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Storage bucket for hero images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-images',
  'hero-images',
  true,
  52428800,  -- 50 MB
  array['image/jpeg','image/jpg','image/png','image/webp','image/avif']
)
on conflict (id) do nothing;

-- Storage policies
create policy "hero_images_public_read"
  on storage.objects for select
  using (bucket_id = 'hero-images');

create policy "hero_images_admin_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'hero-images'
    and auth.role() = 'service_role'
  );

create policy "hero_images_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'hero-images'
    and auth.role() = 'service_role'
  );
