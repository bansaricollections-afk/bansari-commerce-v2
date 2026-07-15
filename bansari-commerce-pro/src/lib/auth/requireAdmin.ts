/**
 * Server-side utility — call inside RSC pages or API route handlers.
 *
 * Both functions use getUser() which validates the JWT against the Supabase
 * Auth server — never trusting client-supplied cookie data alone.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

/** For RSC pages — redirects to /admin/login if not authenticated admin */
export async function requireAdminPage(): Promise<void> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only in RSC
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/admin/login');
  }
}

/** For API route handlers — returns 401/403 NextResponse or the authenticated user info */
export async function requireAdminSession(
  _request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    userId: user.id,
    email: user.email ?? '',
  };
}
