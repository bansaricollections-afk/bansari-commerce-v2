-- Instagram posts — a record of what was published, from where, and to what.
--
-- WHY THIS TABLE EXISTS
-- Publishing without recording it creates three problems that only show up
-- later, when they are expensive:
--
--  1. DUPLICATE POSTS. The publish flow is several network round-trips (upload
--     each image, create a container per image, create the carousel, publish).
--     A timeout on the last step leaves the operator unsure whether it worked.
--     Without a record the honest response is to try again, which is how an
--     account posts the same kurta twice in a minute.
--
--  2. NO ATTRIBUTION. The whole point of posting is traffic. A row per post,
--     carrying the product and the permalink, is what lets "which posts
--     actually sent visitors" be answered later against real rows rather than
--     a memory of what was posted.
--
--  3. NO RATE VISIBILITY. Instagram caps API publishing per rolling 24 hours.
--     Knowing locally what was already sent is cheaper and more reliable than
--     discovering the cap by being refused mid-publish.
--
-- WHY status IS NOT JUST A BOOLEAN
-- Instagram's publish is genuinely two-phase: a container is created and
-- processed asynchronously, then published. A post can therefore exist in a
-- real state that is neither success nor failure. Collapsing that into
-- published/not-published is what produces a UI that claims a post failed
-- while it is in fact about to appear.

create table if not exists public.instagram_posts (
  id                bigserial primary key,

  -- Nullable, and ON DELETE SET NULL rather than CASCADE: the post stays on
  -- Instagram after a product is deleted from the catalogue. Deleting the
  -- record here would not unpublish anything — it would only destroy the
  -- evidence that the post exists.
  product_id        bigint references public.products(id) on delete set null,

  status            text   not null default 'pending'
                      check (status in ('pending', 'published', 'failed')),

  -- Instagram's own ids. media_id is the published post; container_id is the
  -- intermediate object, kept because it is the only handle for diagnosing a
  -- publish that stalled between the two phases.
  ig_media_id       text unique,
  ig_container_id   text,
  permalink         text,

  -- The caption exactly as sent. Instagram allows editing a caption in the
  -- app, so this is a record of what WE published, not what is live now.
  caption           text   not null,
  hashtags          text[] not null default '{}',

  -- The padded 4:5 renditions actually uploaded, in carousel order.
  image_urls        text[] not null default '{}',

  error             text,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_instagram_posts_product
  on public.instagram_posts (product_id);

-- Supports both "what did we post recently" and the rolling 24-hour rate check.
create index if not exists idx_instagram_posts_published_at
  on public.instagram_posts (published_at desc)
  where status = 'published';

comment on table public.instagram_posts is
  'One row per Instagram publish attempt. Written by the admin publish flow '
  'only; never by the storefront.';

-- RLS: service-role only, matching coupons and reviews.
--
-- There is no public policy and that is deliberate. The anon key ships to
-- every browser, so any policy here is a policy for the whole internet. None
-- of this is secret exactly — the posts are public on Instagram — but the
-- table also carries failure reasons and draft captions for products not yet
-- posted, and there is no reason for a storefront visitor to read either.
alter table public.instagram_posts enable row level security;

-- Verify: expect the table to exist with zero rows and rowsecurity = t.
select
  (select count(*) from public.instagram_posts) as rows,
  (select relrowsecurity from pg_class where oid = 'public.instagram_posts'::regclass) as rls_enabled;
