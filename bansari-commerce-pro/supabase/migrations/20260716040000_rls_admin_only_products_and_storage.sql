-- =============================================================================
-- P0-2 + P0-3: Replace unsafe RLS policies with admin-only equivalents
-- =============================================================================
--
-- P0-2 (Products RLS)
-- The initial_schema migration created:
--
--   "Authenticated users can manage products"  FOR ALL  TO authenticated
--   USING (true) WITH CHECK (true)
--
-- This allows ANY logged-in storefront customer to INSERT, UPDATE, or DELETE
-- products — a critical privilege escalation vulnerability.
--
-- This migration drops that policy and replaces it with one that checks
-- app_metadata.role = 'admin', which is set exclusively by server-side code
-- and cannot be forged by a JWT claim from the client.
--
-- P0-3 (Storage RLS)
-- The initial_schema migration created three storage.objects policies:
--
--   "Authenticated users can upload product images"  FOR INSERT
--   "Authenticated users can update product images"  FOR UPDATE
--   "Authenticated users can delete product images"  FOR DELETE
--
-- These allow any authenticated user to overwrite or delete product images.
-- This migration drops all three and replaces them with admin-only equivalents.
--
-- Read access is NOT changed by either block.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- P0-2: Products table — admin-only write policies
-- -----------------------------------------------------------------------------

drop policy if exists "Authenticated users can manage products" on public.products;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'products'
      and policyname = 'Admin users can manage products'
  ) then
    create policy "Admin users can manage products"
      on public.products
      for all
      to authenticated
      using (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
      with check (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- P0-3: Storage — admin-only write policies for product-images bucket
-- -----------------------------------------------------------------------------

drop policy if exists "Authenticated users can upload product images"  on storage.objects;
drop policy if exists "Authenticated users can update product images"  on storage.objects;
drop policy if exists "Authenticated users can delete product images"  on storage.objects;

do $$
begin
  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Admin users can upload product images'
  ) then
    create policy "Admin users can upload product images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'product-images'
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      );
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Admin users can update product images'
  ) then
    create policy "Admin users can update product images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'product-images'
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
      with check (
        bucket_id = 'product-images'
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      );
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Admin users can delete product images'
  ) then
    create policy "Admin users can delete product images"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'product-images'
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Verification queries (run manually in Supabase SQL editor after migration)
-- -----------------------------------------------------------------------------
-- select policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'public' and tablename = 'products'
--  order by policyname;
--
-- select policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and policyname ilike '%product image%'
--  order by policyname;
-- =============================================================================
