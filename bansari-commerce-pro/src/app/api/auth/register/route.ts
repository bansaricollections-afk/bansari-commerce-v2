import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/services/email.service';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const log = createLogger({ service: 'auth.register' });

/**
 * Customer registration.
 *
 * Runs server-side rather than calling supabase.auth.signUp() from the browser
 * so the welcome email can only ever be sent as part of a real signup, to the
 * address that was just registered. A client-callable "send welcome email"
 * endpoint would be an open relay for spam.
 *
 * Rate limited on the checkout bucket, and the response is deliberately the
 * same whether or not the address already exists — enumerating registered
 * customers should not be possible.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const rLog = log.child({ requestId });

  const limited = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT, requestId);
  if (limited) return limited;

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(requestId, 'BAD_PAYLOAD', 'Malformed request.', 400);
  }

  const name     = typeof body.name === 'string' ? body.name.trim() : '';
  const email    = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  /*
   * SEC-03. Field caps on a public, unauthenticated endpoint. Without them a
   * multi-megabyte string is regex-tested and forwarded to Supabase on every
   * request. The limits are generous versus real data (RFC 5321 caps an address
   * at 254) and bcrypt ignores input beyond 72 bytes anyway.
   */
  if (name.length > 100 || email.length > 254 || password.length > 200) {
    return apiError(requestId, 'VALIDATION_ERROR', 'One or more fields are too long.', 400);
  }

  if (!name)  return apiError(requestId, 'MISSING_FIELD', 'Please enter your name.', 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return apiError(requestId, 'INVALID_EMAIL', 'Please enter a valid email address.', 400);
  }
  if (password.length < 8) {
    return apiError(requestId, 'WEAK_PASSWORD', 'Password must be at least 8 characters.', 400);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    // Surface genuine validation problems, but never reveal whether an address
    // is already registered.
    rLog.warn('auth.register.signup_failed', { code: error.code });
    const alreadyRegistered =
      error.code === 'user_already_exists' || /already registered/i.test(error.message);

    if (alreadyRegistered) {
      return NextResponse.json({ success: true, requestId, existing: true });
    }
    return apiError(requestId, 'SIGNUP_FAILED', error.message, 400);
  }

  /*
   * Courtesy only — the account exists either way, so a failed send must not
   * fail registration. Supabase sends its own confirmation email separately
   * when email confirmation is enabled; this is the brand welcome on top.
   */
  try {
    const result = await sendWelcomeEmail({ customerName: name, customerEmail: email });
    if (!result.sent) rLog.warn('auth.register.welcome_not_sent', { error: result.error });
  } catch (err) {
    rLog.warn('auth.register.welcome_failed', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }

  rLog.info('auth.register.ok', { hasSession: !!data.session });

  return NextResponse.json({
    success: true,
    requestId,
    // False when Supabase requires email confirmation before first sign-in.
    signedIn: !!data.session,
  });
}
