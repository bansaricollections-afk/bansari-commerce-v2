-- Product reviews — verified purchases only.
--
-- WHY THIS SHAPE
-- A review is anchored to an ORDER LINE (order_item_id), not to a product and
-- an email. That single choice enforces most of the rules for free:
--   * only someone who bought the thing can review it — there is no order line
--     without a purchase;
--   * one review per purchase, via the unique constraint, so nobody can post
--     ten reviews of the same kurta;
--   * buy the same piece twice and you may review it twice, which is correct;
--   * the product and order are copied onto the row, so the review survives a
--     product being renamed, recategorised or deleted.
--
-- `verified_purchase` is therefore not a flag anyone sets — it is a statement
-- about how the row got here. There is no code path that writes a review
-- without an order line behind it.
--
-- WHY NOTHING PUBLISHES AUTOMATICALLY
-- status starts 'pending'. The storefront only ever reads 'approved'. That is
-- a spam control, not editorial control: a genuine critical review should be
-- approved. Hiding real criticism while showing praise is what makes review
-- sections worthless, and inventing or filtering ratings is exactly what the
-- rest of this codebase refuses to do.

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- What was reviewed. product_id is the live link; product_name is the
  -- snapshot, so a deleted product still shows a coherent review in admin.
  product_id   bigint not null,
  product_name text,

  -- Proof of purchase. order_item_id is UNIQUE: one review per purchased line.
  order_id      bigint not null,
  order_item_id uuid not null unique,

  -- Who. customer_email is never exposed publicly — see the policy note below.
  customer_email text not null,
  author_name    text not null,

  rating  smallint not null check (rating between 1 and 5),
  title   text,
  body    text,

  /*
   * True on every row this schema can produce. Kept as a column rather than
   * assumed, so the storefront can badge "Verified Purchase" by reading a
   * field instead of encoding the assumption in three places — and so a future
   * unverified-review source would have to say so explicitly.
   */
  verified_purchase boolean not null default true,

  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  moderated_at   timestamptz,
  moderated_by   uuid,
  moderation_note text
);

-- "Show me this product's approved reviews" and "what is waiting for me?".
create index if not exists idx_reviews_product_approved
  on public.reviews (product_id, created_at desc) where status = 'approved';

create index if not exists idx_reviews_pending
  on public.reviews (created_at desc) where status = 'pending';

create index if not exists idx_reviews_order
  on public.reviews (order_id);

alter table public.reviews enable row level security;

/*
 * NO public policy of any kind — not even for approved rows.
 *
 * Every row carries customer_email, and RLS is row-level, not column-level: a
 * read policy that exposed approved reviews would expose the buyer's email
 * with them, to anyone holding the anon key that ships in every browser.
 *
 * The storefront does not need one. Product pages are server-rendered and read
 * through createServiceRoleClient(), exactly as products do, and the service
 * layer chooses which columns leave the server. Default deny is correct for
 * everyone else.
 */
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reviews'
      and policyname = 'reviews_service_only'
  ) then
    create policy reviews_service_only on public.reviews
      for all to service_role using (true) with check (true);
  end if;
end $$;
