-- Coupons must be opted IN to public advertising, never opted out.
--
-- THE BUG
-- getFeaturedCoupon() advertises the newest active coupon across the
-- storefront — product pages, cart and checkout. It has no way to tell a
-- campaign code from a private one, so every coupon created for any reason
-- became a public offer.
--
-- Three ways that hurts, all live right now:
--
--  1. RAKSHA20 is a 20% code with max_uses = 1. Advertising it site-wide means
--     the first visitor to notice it takes it, and everyone after sees an
--     offer they cannot use.
--
--  2. FIRSTVISIT10 exists to bring marketplace customers to the site via a
--     printed parcel card. Showing it on the site to people who are already
--     here defeats its purpose and discounts customers who would have paid in
--     full.
--
--  3. Worst: the review thank-you codes. Those are single-use, personal, and
--     emailed to one named customer. Under the old rule, issuing one would
--     publish it on the storefront, where the first stranger to see it would
--     spend someone else's thank-you.
--
-- THE FIX
-- A coupon is private unless somebody says otherwise. Defaulting to false
-- means a code created for any future purpose — a refund gesture, a supplier
-- discount, a one-off apology — cannot accidentally become a public offer. The
-- failure mode of the default is "nobody sees my campaign", which is
-- noticeable and harmless. The failure mode of the opposite is giving away
-- margin silently, which is neither.

alter table public.coupons
  add column if not exists is_public boolean not null default false;

comment on column public.coupons.is_public is
  'True only for codes meant to be advertised on the storefront by '
  'getFeaturedCoupon(). Private by default: single-use, personal and '
  'print-campaign codes must never be published.';

-- Everything that exists today is private. RAKSHA20 is single-use and
-- FIRSTVISIT10 belongs on paper; neither should be on the site. Set
-- is_public = true by hand when a genuine public campaign is wanted.
update public.coupons set is_public = false where is_public is distinct from false;

create index if not exists idx_coupons_public
  on public.coupons (created_at desc)
  where is_public = true and active = true;

-- Verify: expect every row to read is_public = f.
select code, discount_value, max_uses, uses_count, active, is_public
  from public.coupons
 order by created_at desc;
