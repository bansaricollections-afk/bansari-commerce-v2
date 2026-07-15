/**
 * Fail-fast environment validator.
 *
 * Import at the top of any API route or service that requires env vars.
 * Throws a descriptive error at startup/cold-start if any required variable
 * is missing so engineers get an immediate, actionable message instead of
 * a cryptic runtime crash mid-request.
 *
 * Usage:
 *   import { validateEnv } from '@/lib/env';
 *   validateEnv(); // call once per module; safe to call multiple times
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'EMAIL_FROM',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

let validated = false;

/**
 * Validates all required environment variables.
 * Throws an aggregated Error listing every missing variable.
 * Safe to call multiple times — validation only runs once.
 */
export function validateEnv(): void {
  if (validated) return;

  const missing: RequiredEnvVar[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const list = missing.map((k) => `  - ${k}`).join('\n');
    throw new Error(
      `[Bansari Commerce] Missing required environment variables:\n${list}\n\n` +
        'Set these in your .env.local (development) or deployment environment (production) before starting the server.'
    );
  }

  validated = true;
}

/**
 * Read a required env var that has already been validated.
 * Returns the value with type narrowing (never undefined).
 */
export function requireEnv(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`[Bansari Commerce] Environment variable "${key}" is not set.`);
  }
  return value;
}
