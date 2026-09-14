-- Checkout leads — contactable abandoned carts.
--
-- WHY
-- The abandoned-cart screen reads `pending_orders`, and a row there is only
-- written when a Cashfree/Razorpay order is created — i.e. the instant the
-- customer clicks Pay. Everyone who fills in their details and then leaves
-- BEFORE that click is invisible, and Google Analytics only reports a product
-- name, never a person. So a shopper could add to cart, type their email, walk
-- away, and leave no way to contact them.
--
-- This table is written as soon as the contact fields on /checkout are valid,
-- which is the earliest moment there is anything contactable to store.
--
-- It deliberately does NOT reuse pending_orders: rows there feed the payment
-- flow and the idempotency pre-check, and a lead has no payment reference at
-- all. A lead with a NULL cf_order_id would slip past the paid-order exclusion
-- and show a paying customer as abandoned.

create table if not exists public.checkout_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Stable per browser checkout attempt. The client sends the same value as it
  -- edits the form, so the row is upserted rather than one row per keystroke.
  session_id   text not null unique,

  customer_name  text,
  customer_email text not null,
  customer_phone text,

  -- Snapshot of the cart at the moment of capture. Denormalised on purpose:
  -- prices and availability change, and what matters is what they wanted then.
  items        jsonb not null default '[]'::jsonb,
  item_count   integer not null default 0,
  subtotal     numeric(10,2) not null default 0,
  currency     text not null default 'INR',

  -- Set when this lead is known to have converted. Nullable: most never do.
  converted_order_id bigint,

  user_id      uuid
);

-- The three questions asked of this table: "who abandoned recently?",
-- "has this person come back?", and the upsert lookup.
create index if not exists idx_checkout_leads_created_at
  on public.checkout_leads (created_at desc);

create index if not exists idx_checkout_leads_open
  on public.checkout_leads (created_at desc) where converted_order_id is null;

create index if not exists idx_checkout_leads_email
  on public.checkout_leads (lower(customer_email));

alter table public.checkout_leads enable row level security;

/*
 * NO public read policy, and no public write policy either.
 *
 * Every row is a name, an email and a phone number. The anon key ships to
 * every browser, so a read policy here would publish the customer list, and a
 * write policy would let anyone forge leads. The storefront writes through
 * /api/checkout/lead, which runs server-side with the service role, validates
 * the payload and is rate limited. Default deny is correct for everyone else.
 */
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'checkout_leads'
      and policyname = 'checkout_leads_service_only'
  ) then
    create policy checkout_leads_service_only on public.checkout_leads
      for all to service_role using (true) with check (true);
  end if;
end $$;
