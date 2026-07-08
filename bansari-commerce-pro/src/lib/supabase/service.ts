import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side writes only.
 *
 * `orders`/`order_items` RLS defines exactly one policy each (customers
 * may SELECT their own rows) and no INSERT/UPDATE/DELETE policy for any
 * role, and no GRANT statements exist either. This is deliberate — writes
 * are only ever meant to happen through this client, from trusted
 * server-side code, which uses the service_role key and therefore bypasses
 * RLS entirely.
 *
 * NEVER import this into a Client Component or anything that ships to the
 * browser — the service_role key must never be exposed client-side.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service-role configuration: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}