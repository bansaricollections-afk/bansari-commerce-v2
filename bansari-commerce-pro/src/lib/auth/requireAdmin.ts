/**
 * Server-side auth utilities for RSC pages and API route handlers.
 * Uses getUser() which validates the JWT against the Supabase Auth server.
 *
 * ── DIAGNOSTIC INSTRUMENTATION ── remove after root-cause is confirmed ──────
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

const DIAG = process.env.NODE_ENV !== 'production' || process.env.AUTH_DEBUG === '1';

function diagLog(label: string, data: Record<string, unknown>) {
  if (!DIAG) return;
  // eslint-disable-next-line no-console
  console.log(`[AUTH_DIAG] ${label}`, JSON.stringify(data, null, 2));
}

/**
 * Returns true when the Supabase user holds the admin role.
 * Checks app_metadata ONLY — it is server-set (via the service-role/Admin
 * API) and cannot be edited by the user. user_metadata is client-editable
 * via supabase.auth.updateUser() and MUST NOT be treated as a trusted
 * privilege source.
 */
function isAdminUser(user: {
  app_metadata?: Record<string, unknown>;
}): boolean {
  return user.app_metadata?.role === 'admin';
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

/**
 * For Server Actions ('use server' functions) — no NextRequest/NextResponse
 * available in that context, so this returns null on failure instead of a
 * Response. Callers must translate null into their own ActionResult shape.
 * Uses the same getUser() + isAdminUser() check as requireAdminSession.
 */
export async function requireAdminAction(): Promise<{ userId: string; email: string } | null> {
  const supabase = await makeServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) return null;

  return { userId: user.id, email: user.email ?? '' };
}

/** For API route handlers — returns 401/403 or the verified user identity. */
export async function requireAdminSession(
  _request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  // ── 1. Cookie inventory ───────────────────────────────────────────────────
  const cookieStore = await cookies();
  const allCookies  = cookieStore.getAll();
  const cookieNames = allCookies.map((c) => c.name);
  const hasSbToken  = cookieNames.some((n) => n.startsWith('sb-') && n.endsWith('-auth-token'));
  const sbCookies   = cookieNames.filter((n) => n.startsWith('sb-'));

  diagLog('1_cookies', {
    totalCookies: cookieNames.length,
    cookieNames,
    hasSbAuthToken: hasSbToken,
    sbRelatedCookies: sbCookies,
  });

  const supabase = await makeServerClient();

  // ── 2. getSession() — reads from cookie without network round-trip ────────
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  diagLog('2_getSession', {
    hasSession:   !!sessionData?.session,
    userId:       sessionData?.session?.user?.id ?? null,
    expiresAt:    sessionData?.session?.expires_at ?? null,
    accessTokenPrefix: sessionData?.session?.access_token
      ? sessionData.session.access_token.substring(0, 20) + '…'
      : null,
    error:        sessionError?.message ?? null,
  });

  // ── 3. getUser() — validates JWT against Supabase Auth server ─────────────
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  diagLog('3_getUser', {
    hasUser:          !!user,
    userId:           user?.id ?? null,
    email:            user?.email ?? null,
    appMetadata:      user?.app_metadata ?? null,
    userMetadata:     user?.user_metadata ?? null,
    error:            userError?.message ?? null,
  });

  // ── 4. isAdminUser check ──────────────────────────────────────────────────
  if (!user) {
    diagLog('4_result', { outcome: '401_UNAUTHORIZED', reason: 'getUser returned null' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminCheck = isAdminUser(user);
  diagLog('4_isAdminUser', {
    reached:            true,
    appMetadataRole:    user.app_metadata?.role ?? null,
    userMetadataRole:   user.user_metadata?.role ?? null,
    isAdmin:            adminCheck,
  });

  if (!adminCheck) {
    diagLog('5_result', { outcome: '403_FORBIDDEN', reason: 'user has no admin role' });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  /*
   * ── 5. Multi-factor assurance ────────────────────────────────────────────
   *
   * THIS IS THE ENFORCEMENT POINT. The login screen asks for a TOTP code, but
   * a login screen is just a client — anyone can skip it and call the API with
   * a password-only (AAL1) session. MFA is only real if the server refuses to
   * act on an AAL1 session, which is what this does.
   *
   * Supabase reports two levels:
   *   currentLevel — what this session has actually achieved
   *   nextLevel    — the highest the user COULD reach, i.e. 'aal2' once they
   *                  have at least one verified factor enrolled
   *
   * So `nextLevel === 'aal2' && currentLevel !== 'aal2'` means precisely:
   * "this account has MFA set up and this session has not satisfied it."
   *
   * FAILS OPEN BEFORE ENROLMENT, ON PURPOSE. When no factor is enrolled,
   * nextLevel is 'aal1' and this check passes. That is deliberate — requiring
   * a factor that does not exist yet would lock the only admin out of the
   * panel they need in order to enrol. Security arrives when the factor is
   * added, and from that moment it cannot be skipped.
   *
   * A failure to READ the assurance level is treated as a pass rather than a
   * denial: this runs on every admin request, and a transient Auth outage
   * should not take the whole admin panel offline. The password and role
   * checks above have already run, so the floor is never lower than it was
   * before MFA existed.
   */
  try {
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    diagLog('6_mfa', {
      currentLevel: aal?.currentLevel ?? null,
      nextLevel: aal?.nextLevel ?? null,
      error: aalError?.message ?? null,
    });

    if (!aalError && aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      diagLog('6_result', { outcome: '403_MFA_REQUIRED', userId: user.id });
      return NextResponse.json(
        { error: 'MFA required', code: 'MFA_REQUIRED' },
        { status: 403 }
      );
    }
  } catch (err) {
    // See "fails open" above — log loudly, do not deny.
    diagLog('6_mfa_threw', { message: err instanceof Error ? err.message : String(err) });
  }

  diagLog('7_result', { outcome: 'PASS', userId: user.id, email: user.email });
  return { userId: user.id, email: user.email ?? '' };
}
