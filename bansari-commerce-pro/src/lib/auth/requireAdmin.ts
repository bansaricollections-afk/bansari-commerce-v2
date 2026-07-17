/**
 * Server-side auth utilities for RSC pages and API route handlers.
 * Uses getUser() which validates the JWT against the Supabase Auth server.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns true when the Supabase user holds the admin role.
 * Checks app_metadata (server-set, canonical) then user_metadata as fallback.
 */
function isAdminUser(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): boolean {
  return (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
  );
}

async function makeServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // Read-only in RSC — session refresh is handled by middleware.
        setAll() {},
      },
    }
  );
}

/** For RSC pages — redirects to /admin/login if not an authenticated admin. */
export async function requireAdminPage(): Promise<void> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    redirect('/admin/login');
  }
}

/** For API route handlers — returns 401/403 or the verified user identity. */
export async function requireAdminSession(
  _request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, email: user.email ?? '' };
}
