-- Put the categories people actually use at the top of the admin dropdown.
--
-- THE BUG THIS FIXES IS A DATA-ENTRY BUG, NOT A DISPLAY ONE
-- The Add Product form lists categories by display_order. The order was:
--
--   1 Sarees        0 products
--   2 Suits         7
--   3 Lehengas      0 products
--   4 Kurtis        6
--   5 Accessories   0 products
--   6 Dupattas      0 products
--   7 Co-Ord Sets  11
--   8 Tops          4
--  10 Dresses      11
--  10 Kurta Sets   22   <- the largest category, tied on 10, sorted LAST
--
-- So four empty categories sat above every real one, and the single most-used
-- category — 22 of 61 products — fell to the bottom of the list.
--
-- The consequence was not cosmetic. Product 41, "Black & Gold Muslin Kurta Set
-- with Palazzo & Dupatta", was filed under Suits. That wrong value then
-- travelled: onto the product page, into the Google and Meta feeds, into the
-- browse landings, and into an Instagram caption and its hashtags
-- (#artsilksuit rather than #kurtaset). A form that makes the right answer
-- hard to reach produces wrong data, and wrong data spreads.
--
-- WHY THIS IS SAFE FOR THE STOREFRONT
-- The shop's navigation and facets come from getShopFacets(), which derives
-- categories from the products that actually exist. This column is read only
-- by the admin catalog API. Reordering here changes the form and nothing the
-- customer sees.
--
-- WHY THE EMPTY CATEGORIES ARE KEPT
-- Sarees, Lehengas, Dupattas and Accessories carry no products today, and the
-- storefront already hides them for that reason. They stay in the table
-- because the shop intends to stock them — deleting them would lose the
-- taxonomy. They simply move below the categories in daily use.

update public.categories set display_order = 1  where name = 'Kurta Sets';   -- 22
update public.categories set display_order = 2  where name = 'Co-Ord Sets';  -- 11
update public.categories set display_order = 3  where name = 'Dresses';      -- 11
update public.categories set display_order = 4  where name = 'Suits';        --  7
update public.categories set display_order = 5  where name = 'Kurtis';       --  6
update public.categories set display_order = 6  where name = 'Tops';         --  4
-- Stocked in future, empty today. Below the fold rather than above it.
update public.categories set display_order = 7  where name = 'Sarees';
update public.categories set display_order = 8  where name = 'Lehengas';
update public.categories set display_order = 9  where name = 'Dupattas';
update public.categories set display_order = 10 where name = 'Accessories';

-- Verify: expect Kurta Sets first, no duplicate display_order values.
select
  c.display_order,
  c.name,
  (select count(*) from public.products p where p.active and p.category = c.name) as products
from public.categories c
order by c.display_order;
