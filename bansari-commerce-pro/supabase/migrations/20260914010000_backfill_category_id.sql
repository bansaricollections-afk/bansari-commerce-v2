-- Backfill products.category_id, and refile one mis-categorised dress.
--
-- WHY
-- Products carry the category twice: `category` (text) and `category_id` (FK).
-- The storefront, browse landings and filters all read the TEXT column, so the
-- seven rows below were never broken for customers — but their category_id was
-- left NULL when they were first imported. That makes any future join against
-- `categories` silently drop them, and it means the two columns can drift
-- without anything noticing.
--
-- An audit of all 46 products found NO other disagreement: every non-null
-- category_id already matches its text category. This closes the only gap.
--
-- Safe to run twice. Touches no stock, no orders, no prices.

begin;

-- ── 1. Backfill the NULL category_id from the text category ───────────────
-- Matched by name rather than hardcoded ids, so a renumbered categories table
-- cannot mis-assign anything. Rows whose text category has no matching
-- category row are left alone rather than guessed at.
update public.products p
   set category_id = c.id,
       updated_at  = now()
  from public.categories c
 where p.category_id is null
   and p.category is not null
   and lower(trim(p.category)) = lower(trim(c.name));

-- ── 2. #24 is an A-line dress filed under Kurtis ──────────────────────────
-- Currently inactive, so this is invisible to customers today; doing it now
-- means it lands in the right place when it is relisted. Both columns are
-- updated together — updating only one is how they drift apart.
update public.products p
   set category    = c.name,
       category_id = c.id,
       updated_at  = now()
  from public.categories c
 where p.id = 24
   and c.slug = 'dresses'
   and p.category is distinct from c.name;

commit;

-- ── Verification ──────────────────────────────────────────────────────────
-- Expect: zero rows. Any row returned is a product whose two category columns
-- still disagree, or which has a category name that does not exist.
select p.id,
       p.active,
       p.category      as text_category,
       p.category_id,
       c.name          as fk_category,
       p.name
  from public.products p
  left join public.categories c on c.id = p.category_id
 where c.name is distinct from p.category
 order by p.id;
