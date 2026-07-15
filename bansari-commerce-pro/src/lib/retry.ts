/**
 * Exponential-backoff retry for transient failures.
 *
 * ONLY retry operations that are safe to repeat:
 *   - Supabase SELECT queries
 *   - Razorpay GET / fetch-payment calls
 *   - Resend email sends (idempotent by recipient + content)
 *
 * NEVER retry:
 *   - Supabase INSERT without ON CONFLICT (would duplicate rows)
 *   - Razorpay orders.create (would create multiple payment orders)
 *   - Any destructive or state-mutating write
 */

export type RetryOptions = {
  maxAttempts?: number;   // default 3
  baseDelayMs?: number;   // default 200
  /** Optional predicate: return false to abort retry immediately. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;

function jitter(ms: number): number {
  // ±10 % of the delay value.
  return ms + (Math.random() * 0.2 - 0.1) * ms;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * withRetry
 *
 * Retries `fn` up to `maxAttempts` times with exponential backoff.
 * Throws the last error if all attempts fail.
 *
 * @example
 *   const payment = await withRetry(
 *     () => fetchRazorpayPayment(paymentId),
 *     { maxAttempts: 3, baseDelayMs: 200 }
 *   );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts) {
        break;
      }

      if (!shouldRetry(err, attempt)) {
        break;
      }

      const delay = jitter(baseDelayMs * Math.pow(2, attempt - 1));
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * isTransientError
 *
 * Returns true for errors that are safe to retry:
 *   - Network timeouts / fetch failures
 *   - Supabase 5xx
 *   - Razorpay 429 / 5xx
 *   - Resend 429 / 5xx
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Razorpay SDK and fetch() network errors
  if (typeof err.message === 'string') {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound') ||
      msg.includes('socket')
    ) {
      return true;
    }
  }

  // HTTP status code embedded in error (Razorpay SDK, Resend SDK)
  if (typeof err.statusCode === 'number') {
    return err.statusCode === 429 || err.statusCode >= 500;
  }

  if (typeof err.status === 'number') {
    return err.status === 429 || err.status >= 500;
  }

  return false;
}
