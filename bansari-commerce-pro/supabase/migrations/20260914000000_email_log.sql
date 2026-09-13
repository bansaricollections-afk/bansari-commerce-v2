-- Email send log.
--
-- WHY
-- A paying customer received no order confirmation and nothing recorded it.
-- Three things hid the failure: sendEmail() returns { sent: false } instead of
-- throwing, both order paths only checked for a thrown error, and the health
-- endpoint reported "ok" whenever an API key merely existed. The first two are
-- now fixed in code, but there was still no record of WHICH emails were
-- attempted, to whom, and what the provider said.
--
-- Server logs are not enough: they expire, they are not queryable per order,
-- and nobody reads them until something has already gone wrong. This table is
-- the durable answer to "did this customer actually get their receipt".

create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Recipient and what was sent. `template` is the logical email type
  -- (order_confirmation, order_shipped, …) so failures can be grouped by kind.
  recipient    text not null,
  subject      text not null,
  template     text,

  -- Outcome as reported by the provider.
  sent         boolean not null,
  error        text,

  -- Optional link back to the order this email belongs to. Nullable and NOT a
  -- foreign key on purpose: welcome and marketing emails have no order, and a
  -- logging table must never be able to block or cascade against orders.
  order_number text
);

-- The two questions actually asked of this table: "what failed recently?" and
-- "what happened to this order's emails?".
create index if not exists idx_email_log_created_at
  on public.email_log (created_at desc);

create index if not exists idx_email_log_failed
  on public.email_log (created_at desc) where sent = false;

create index if not exists idx_email_log_order
  on public.email_log (order_number) where order_number is not null;

alter table public.email_log enable row level security;

/*
 * NO public read policy. These rows contain customer email addresses, and the
 * anon key is shipped to every browser. Only the service role — which never
 * leaves the server — may read or write, so the default deny is correct.
 * Adding a read policy here would expose the customer list.
 */
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'email_log'
      and policyname = 'email_log_service_write'
  ) then
    create policy email_log_service_write on public.email_log
      for all to service_role using (true) with check (true);
  end if;
end $$;
