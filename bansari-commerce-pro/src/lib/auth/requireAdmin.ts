/**
 * Server-side utility — call inside RSC pages or API route handlers.
 * Returns the authenticated admin session or throws a Response.
 *
 * Usage in API routes:
 *   const session = await requireAdminSession(request);
 *
 * Usage in RSC pages:
 *   await requireAdminPage();
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || session.user.app_metadata?.role !== 'admin') {
    redirect('/admin/login');
  }
}

/** For API route handlers — returns 401/403 NextResponse or the session */
export async function requireAdminSession(
  request: NextRequest
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
  };
}
