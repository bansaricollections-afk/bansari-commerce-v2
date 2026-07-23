/**
 * src/lib/supabase/service.ts
 *
 * Creates a Supabase client that authenticates with the service-role
 * secret key, bypassing Row-Level Security.  Use ONLY in trusted
 * server-side contexts (Server Actions, API Routes, background jobs).
 *
 * Never import this module in Client Components or expose it to the
 * browser bundle.
 *
 * Uses @supabase/supabase-js ^2.110 (no cookie handling needed).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Disable session persistence — the service-role key is a static
        // secret that never needs to be refreshed or stored in cookies.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
