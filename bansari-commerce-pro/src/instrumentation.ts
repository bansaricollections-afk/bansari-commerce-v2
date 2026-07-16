/**
 * instrumentation.ts — Next.js server startup validation.
 *
 * This file is executed ONCE when the Next.js server boots (both in
 * development and production). It performs a fail-fast check on every
 * required environment variable.
 *
 * If any required variable is missing the server will throw immediately
 * rather than serving requests that will fail at payment or database time.
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnvironment();
  }
}

type EnvSpec = {
  key: string;
  description: string;
  /** Optional: validate the value beyond just being non-empty. */
  validate?: (value: string) => boolean;
  validateMessage?: string;
};

const REQUIRED_ENV: EnvSpec[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    validate: (v) => v.startsWith('https://') && v.includes('.supabase.co'),
    validateMessage: 'Must be a valid Supabase project URL (https://*.supabase.co)',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key',
    validate: (v) => v.length > 40,
    validateMessage: 'Must be a valid Supabase anon JWT (>40 chars)',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service-role key (server-only)',
    validate: (v) => v.length > 40,
    validateMessage: 'Must be a valid Supabase service-role JWT (>40 chars)',
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    description: 'Public site URL (used in emails and canonical meta)',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
    validateMessage: 'Must start with http:// or https://',
  },
  {
    key: 'RAZORPAY_KEY_ID',
    description: 'Razorpay live/test key ID',
    validate: (v) => v.startsWith('rzp_'),
    validateMessage: 'Must start with rzp_ (live: rzp_live_... / test: rzp_test_...)',
  },
  {
    key: 'RAZORPAY_KEY_SECRET',
    description: 'Razorpay key secret',
    validate: (v) => v.length >= 20,
    validateMessage: 'Must be at least 20 characters',
  },
  {
    key: 'RAZORPAY_WEBHOOK_SECRET',
    description: 'Razorpay webhook signing secret',
    validate: (v) => v.length >= 8,
    validateMessage: 'Must be at least 8 characters',
  },
  {
    key: 'RESEND_API_KEY',
    description: 'Resend transactional email API key',
    validate: (v) => v.startsWith('re_'),
    validateMessage: 'Must start with re_',
  },
  {
    key: 'EMAIL_FROM',
    description: 'From address for transactional emails',
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.includes(' <'),
    validateMessage: 'Must be a valid email address or "Name <email@domain.com>" format',
  },
];

function validateEnvironment(): void {
  const errors: string[] = [];

  for (const spec of REQUIRED_ENV) {
    const value = process.env[spec.key];

    if (!value || value.trim() === '') {
      errors.push(
        `  ✗ ${spec.key} is missing\n    → ${spec.description}`
      );
      continue;
    }

    if (spec.validate && !spec.validate(value)) {
      errors.push(
        `  ✗ ${spec.key} has an invalid value\n    → ${spec.validateMessage ?? spec.description}`
      );
    }
  }

  if (errors.length > 0) {
    const message = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║        FATAL: Missing or invalid environment variables       ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      'The following required environment variables are missing or invalid:',
      '',
      ...errors,
      '',
      'Set all variables in your .env.local (development) or',
      'Vercel / hosting provider dashboard (production) and restart.',
      '',
    ].join('\n');

    // throw terminates the boot process immediately.
    // No payment route will ever be served with missing credentials.
    throw new Error(message);
  }

  // All variables present and valid.
  const timestamp = new Date().toISOString();
  const lines = [
    '',
    `[${timestamp}] Environment validation passed.`,
    `  ✓ ${REQUIRED_ENV.length} required variables present and valid.`,
    '',
  ].join('\n');

  // Use console.log — available in all runtimes (nodejs, edge, browser).
  // process.stdout is nodejs-only and triggers Turbopack static-analysis
  // warnings even when guarded by a NEXT_RUNTIME runtime check.
  console.log(lines);
}
