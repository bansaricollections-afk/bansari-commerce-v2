-- Product 17 image order, done idempotently this time.
--
-- WHAT WENT WRONG WITH THE PREVIOUS MIGRATION
-- 20260922010000 reordered by POSITION — it rebuilt the array as
-- [1,2,3,4,5,6,7,0], which is a rotation. Rotations compose. Its only guard
-- was `jsonb_array_length(images) = 8`, which is still true after it runs, so
-- the statement was not protected against being executed twice.
--
-- It was, and the array rotated twice:
--
--   original     [y3, y1, y7, y5, chatgpt, y6, y4, y2]
--   after 1 run  [y1, y7, y5, chatgpt, y6, y4, y2, y3]   <- intended
--   after 2 runs [y7, y5, chatgpt, y6, y4, y2, y3, y1]   <- what happened
--
-- leaving y1 (the clean full-length shot) last and y3 (the frame containing a
-- shop sign reading "TARINI JAIPUR") back in the middle of the set.
--
-- A migration that changes meaning when run twice is a bug regardless of
-- whether anyone runs it twice. Re-running is normal: a partial failure, a
-- fresh environment, a copy-paste. Idempotency is not an optimisation.
--
-- THE FIX
-- Order by CONTENT rather than by position. Each frame is placed by what it
-- IS, so the result depends only on which images exist, never on where they
-- currently sit. Running this once and running it ten times give the same
-- array.
--
--   y1      first  — verified clean: full length, no signage
--   y3      last   — contains the "TARINI JAIPUR" sign; kept, not deleted,
--                    because the photo is otherwise usable and the sign could
--                    be cropped out later
--   others  middle — relative order preserved
--
-- NOTE: only y1 and y3 have been looked at. The remaining frames, including
-- the one named chatgpt-image-*, have not been reviewed for invented signage
-- or garbled text. Nothing automated can check that.

with ordered as (
  select jsonb_agg(elem order by sort_key, ord) as images
  from (
    select
      elem,
      ord,
      case
        when elem->>'url' like '%y1-c444%' then 0   -- verified clean
        when elem->>'url' like '%y3-c444%' then 2   -- contains the sign
        else 1
      end as sort_key
    from public.products p,
         lateral jsonb_array_elements(p.images) with ordinality as t(elem, ord)
    where p.id = 17
  ) s
)
update public.products
set images = (select images from ordered)
where id = 17
  and (select images from ordered) is not null;

-- Verify: primary must end y1-c444, last must end y3-c444. Re-running this
-- migration must not change either.
select
  id,
  jsonb_array_length(images) as image_count,
  right(images->0->>'url', 14) as primary_image,
  right(images->(jsonb_array_length(images) - 1)->>'url', 14) as last_image
from public.products
where id = 17;
