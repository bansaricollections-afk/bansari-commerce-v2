/**
 * src/lib/supabase/server.ts
 *
 * Async factory that creates a Supabase client bound to the current
 * request's cookie store.  Safe to call from:
 *   - React Server Components
 *   - Server Actions  (setAll is writable so session refreshes propagate)
 *   - Route Handlers
 *
 * Uses @supabase/ssr ^0.12 + Next.js 16 App Router cookie API.
 * Mirrors the pattern in src/lib/auth/requireAdmin.ts.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies() is
            // read-only.  The try/catch silences the error; session
            // refresh is handled upstream by middleware instead.
          }
        },
      },
    }
  );
}
