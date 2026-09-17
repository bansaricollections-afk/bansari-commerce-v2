-- Review photos, and the thank-you coupon that follows one.
--
-- WHY THE REWARD IS NOT CONDITIONAL ON A GOOD REVIEW
-- The coupon is issued for a review WITH A PHOTO, whatever the rating says.
-- Paying only for praise is against Google's and Meta's review policies, is
-- prohibited by the FTC's endorsement rules and by consumer-protection law in
-- several markets, and — the practical objection — it produces a review
-- section nobody believes, which is the opposite of the reason for having one.
--
-- A photo is a fair thing to reward: it takes real effort, it cannot be
-- fabricated from a desk, and a photo of the garment on a real person is the
-- single most useful thing a shopper can leave behind. Rating is not a
-- condition anywhere in this schema or in the code that reads it.

alter table public.reviews
  add column if not exists photos jsonb not null default '[]'::jsonb;

/*
 * The coupon issued for this review, once. Nullable because most reviews will
 * not have a photo, and UNIQUE because a coupon belongs to exactly one review
 * — that is what stops a second approval, or an approve/reject/approve cycle,
 * from minting a second code for the same words.
 */
alter table public.reviews
  add column if not exists reward_coupon_code text;

alter table public.reviews
  add column if not exists reward_issued_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_reward_coupon_code_key'
  ) then
    alter table public.reviews
      add constraint reviews_reward_coupon_code_key unique (reward_coupon_code);
  end if;
end $$;

-- "Which approved reviews carry a photo?" — drives the reward path and,
-- later, showing photo reviews first on a product page.
create index if not exists idx_reviews_with_photos
  on public.reviews ((jsonb_array_length(photos)))
  where status = 'approved';

-- ── Storage for the photos ────────────────────────────────────────────────
--
-- A bucket of its own rather than reusing product-images: these are
-- customer-supplied files, and they should never sit in the same namespace as
-- the catalogue photography that the image pipeline and the Merchant feed
-- read from.
--
-- Public READ, because an approved review photo is shown on the product page.
-- No public WRITE: uploads go through /api/reviews/photo, which checks the
-- signed token, the file's magic bytes and its size before anything is stored.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  5242880, -- 5 MB; a phone photo, not a RAW file
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'review_photos_public_read'
  ) then
    create policy review_photos_public_read on storage.objects
      for select to public
      using (bucket_id = 'review-photos');
  end if;
end $$;

/*
 * Deliberately NO insert/update/delete policy for anon or authenticated.
 * Writes happen server-side with the service role, which bypasses RLS, after
 * the upload route has validated the token and the file. A browser holding the
 * anon key cannot put anything in this bucket.
 */
