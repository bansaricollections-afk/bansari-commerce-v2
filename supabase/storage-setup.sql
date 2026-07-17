-- =============================================================================
-- Supabase Storage: product-images bucket + RLS policies
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create the bucket (idempotent)
--    public = true  → getPublicUrl() works without a signed URL
--    file_size_limit = 5 MB
--    allowed_mime_types restricts to image formats only
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET
    public            = EXCLUDED.public,
    file_size_limit   = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Drop any stale policies before recreating (safe to re-run)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access for product images"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product-images"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product-images"    ON storage.objects;
DROP POLICY IF EXISTS "Admin anon upload product-images"       ON storage.objects;
DROP POLICY IF EXISTS "Admin anon update product-images"       ON storage.objects;
DROP POLICY IF EXISTS "Admin anon delete product-images"       ON storage.objects;

-- -----------------------------------------------------------------------------
-- 3. Public SELECT — anyone can read images (required for public URLs to work)
-- -----------------------------------------------------------------------------
CREATE POLICY "Public read access for product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- -----------------------------------------------------------------------------
-- 4. INSERT — allow authenticated users (admin panel uses anon key with
--    Supabase Auth session; adjust role as needed for your auth setup)
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated upload to product-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- -----------------------------------------------------------------------------
-- 5. UPDATE — allow authenticated users to replace objects
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated update product-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

-- -----------------------------------------------------------------------------
-- 6. DELETE — allow authenticated users to remove objects
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated delete product-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- -----------------------------------------------------------------------------
-- NOTE: If your admin panel is NOT using Supabase Auth (i.e. you are using
-- the anon key without a logged-in session), replace TO authenticated with
-- TO anon in the INSERT/UPDATE/DELETE policies above, OR use the service role
-- key on the server side for uploads instead of the browser client.
--
-- The safest production pattern is:
--   Browser → Next.js API Route (uses service role key) → Supabase Storage
-- This avoids exposing storage write access through the anon key entirely.
-- -----------------------------------------------------------------------------
