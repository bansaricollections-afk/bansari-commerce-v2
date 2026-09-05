import { createClient } from '@/lib/supabase/client';

/**
 * TOTP multi-factor authentication for the admin panel.
 *
 * WHY THIS EXISTS
 * `/admin/login` authenticates against Supabase Auth with an email and
 * password. Enabling 2FA on the Supabase or Vercel *dashboards* does nothing
 * for it — those protect different accounts entirely. Until this existed,
 * anyone holding the admin email and password had orders, pricing and customer
 * PII, with no second factor anywhere in the path.
 *
 * WHERE ENFORCEMENT ACTUALLY LIVES
 * Not here. This module is the client half: it drives enrolment and answers
 * the challenge at login. A client can always be bypassed, so the real gate is
 * `requireAdminSession()`, which refuses any session that has not reached AAL2
 * when the account has a factor enrolled. Treat everything in this file as
 * user experience, not as a security control.
 *
 * ASSURANCE LEVELS
 *   aal1 — password only
 *   aal2 — password plus a verified factor
 * `nextLevel === 'aal2'` means the account has at least one enrolled factor,
 * regardless of what this session has achieved.
 */

export type MfaStatus = {
  /** The account has at least one verified factor. */
  enrolled: boolean;
  /** This session has satisfied MFA (or none is required). */
  satisfied: boolean;
  /** A verified factor's id, when one exists — needed to raise a challenge. */
  factorId: string | null;
};

/** Where the current session stands relative to what the account requires. */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = createClient();

  const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;

  const enrolled = aal?.nextLevel === 'aal2';
  const satisfied = !enrolled || aal?.currentLevel === 'aal2';

  let factorId: string | null = null;
  if (enrolled) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    // `totp` already contains only verified factors; unverified enrolments
    // sit in `all` and must never be treated as satisfying MFA.
    factorId = factors?.totp?.[0]?.id ?? null;
  }

  return { enrolled, satisfied, factorId };
}

/**
 * Begin enrolment. Returns the QR code and the secret to type manually.
 *
 * The factor is UNVERIFIED until `confirmEnrollment` succeeds with a code from
 * the authenticator app. That ordering matters: it proves the user actually
 * scanned the secret before the account starts demanding it, so a mistyped or
 * abandoned enrolment cannot lock them out.
 */
export async function startEnrollment(): Promise<{
  factorId: string;
  qrSvg: string;
  secret: string;
}> {
  const supabase = createClient();

  /*
   * Clear abandoned attempts first. Supabase rejects a second enrolment with
   * the same friendly name, so a half-finished attempt would otherwise make
   * every future try fail with a confusing "already exists" error.
   */
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.all ?? []) {
    if (f.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Bansari Admin',
  });
  if (error) throw error;

  return {
    factorId: data.id,
    qrSvg: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Finish enrolment by proving the authenticator produces the right code.
 * On success the session is immediately raised to AAL2, so the admin is not
 * bounced back to a challenge screen straight after setting it up.
 */
export async function confirmEnrollment(factorId: string, code: string): Promise<void> {
  const supabase = createClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) throw verifyError;
}

/**
 * Answer the challenge at login, raising an AAL1 session to AAL2.
 * Same call shape as enrolment confirmation — kept separate because the two
 * read very differently at the call site and are logged differently.
 */
export async function verifyMfaCode(factorId: string, code: string): Promise<void> {
  const supabase = createClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyError) throw verifyError;
}

/**
 * Remove a factor, returning the account to password-only.
 *
 * Supabase requires the CURRENT session to already be AAL2 to unenroll, which
 * is the protection that matters here: someone who steals a password-only
 * session cannot use this to strip MFA off the account.
 */
export async function removeFactor(factorId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
