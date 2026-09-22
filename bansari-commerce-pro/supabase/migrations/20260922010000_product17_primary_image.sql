-- Product 17: stop showing another brand's shop sign as the primary image.
--
-- WHAT IS WRONG
-- The first image of "Bansari Women's Mustard Yellow Pure Cotton Hand Block
-- Print Kurta with White Tulip Pants" is AI-generated and contains a rendered
-- shop sign reading "TARINI JAIPUR". The generator invented a storefront and
-- gave it a brand name that is not this business's.
--
-- Because it is the FIRST image, it is the one used almost everywhere:
--   - the product page's main photograph
--   - the shop and collection grids
--   - g:image_link in the Google and Meta product feeds
--   - the og:image a link preview shows when the product is shared
--   - the cover slide of the Instagram guide carousel
--
-- So a competitor's — or simply another company's — signage is currently the
-- most legible text on this product's listing, including in two merchant
-- feeds.
--
-- THE FIX
-- Move that frame to the end of the array rather than deleting it. The
-- photograph is otherwise fine and the merchant may want to crop the sign out
-- and restore it; destroying it here would remove that option. Image 1 — the
-- same garment, full length, no signage — becomes primary.
--
-- This is a reordering only. No image is added, removed or re-uploaded.
--
-- TO REVERT: run the same jsonb_build_array with element 0 first.

update public.products
set images = jsonb_build_array(
      images->1,   -- clean full-length shot, becomes primary
      images->2,
      images->3,
      images->4,
      images->5,
      images->6,
      images->7,
      images->0    -- the frame containing the "TARINI JAIPUR" sign
    )
where id = 17
  and jsonb_array_length(images) = 8;

-- Verify: expect the first filename to be the one ending y1-c444.jpg, and the
-- last to be the one ending y3-c444.jpg.
select
  id,
  jsonb_array_length(images) as image_count,
  images->0->>'url' as primary_image,
  images->7->>'url' as last_image
from public.products
where id = 17;
