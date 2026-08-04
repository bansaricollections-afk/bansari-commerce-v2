-- ============================================================
-- Homepage Campaign CMS Migration
-- ============================================================
-- Run via Supabase Dashboard SQL Editor or `supabase db push`

create extension if not exists "uuid-ossp";

create type campaign_status as enum ('draft', 'published', 'scheduled', 'archived');
create type text_alignment as enum ('left', 'center', 'right');
create type image_position as enum ('center', 'top', 'bottom', 'left', 'right');
create type button_style as enum ('filled', 'outline', 'ghost');

create table if not exists homepage_campaigns (
  id                 uuid primary key default uuid_generate_v4(),
  title              text not null,
  headline_line1     text,
  headline_highlight text,
  headline_line2     text,
  description        text,
  cta_primary_text   text,
  cta_primary_link   text,
  cta_secondary_text text,
  cta_secondary_link text,
  desktop_image      text,
  tablet_image       text,
  mobile_image       text,
  video_url          text,
  image_alt          text,
  overlay_color      text not null default '#000000',
  overlay_opacity    numeric(4,3) not null default 0.3
                       check (overlay_opacity between 0 and 1),
  text_alignment     text_alignment not null default 'left',
  image_position     image_position not null default 'center',
  button_style       button_style not null default 'filled',
  sort_order         integer not null default 0,
  priority           integer not null default 0,
  status             campaign_status not null default 'draft',
  start_date         timestamptz,
  end_date           timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_homepage_campaigns_status
  on homepage_campaigns (status);

create index if not exists idx_homepage_campaigns_sort
  on homepage_campaigns (sort_order asc);

create index if not exists idx_homepage_campaigns_schedule
  on homepage_campaigns (start_date, end_date)
  where status = 'published';

-- RLS: allow public read of published campaigns only
alter table homepage_campaigns enable row level security;

create policy "Public can read published campaigns"
  on homepage_campaigns for select
  using (status = 'published');

create policy "Service role has full access"
  on homepage_campaigns for all
  using (true)
  with check (true);

-- Supabase Storage bucket for campaign images
insert into storage.buckets (id, name, public)
values ('homepage-campaigns', 'homepage-campaigns', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can read campaign images"
  on storage.objects for select
  using (bucket_id = 'homepage-campaigns');

create policy "Service role can manage campaign images"
  on storage.objects for all
  using (bucket_id = 'homepage-campaigns')
  with check (bucket_id = 'homepage-campaigns');
