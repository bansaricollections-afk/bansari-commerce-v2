import { NextRequest, NextResponse } from 'next/server';

/**
 * In-process IP-based rate limiter.
 *
 * Uses a sliding-window counter stored in a module-level Map.
 * Suitable for Vercel serverless (single invocation per function instance);
 * does NOT provide cross-instance coordination — use Upstash Redis for that
 * at higher traffic volumes.
 *
 * Limits:
 *   checkout  — 20 requests / 60 s
 *   payment   — 10 requests / 60 s  (verify-payment)
 *   webhook   — 120 requests / 60 s
 *   admin     — 60 requests / 60 s
 */

type WindowEntry = {
  count: number;
  windowStart: number;
};

const store = new Map<string, WindowEntry>();

// Clean up stale entries every 5 minutes to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= windowMs) {
      store.delete(key);
    }
  }
}

export type RateLimitConfig = {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

export const RATE_LIMIT_CHECKOUT: RateLimitConfig  = { limit: 20,  windowMs: 60_000 };
export const RATE_LIMIT_PAYMENT: RateLimitConfig   = { limit: 10,  windowMs: 60_000 };
export const RATE_LIMIT_WEBHOOK: RateLimitConfig   = { limit: 120, windowMs: 60_000 };
export const RATE_LIMIT_ADMIN: RateLimitConfig     = { limit: 60,  windowMs: 60_000 };

/**
 * Extracts the best-available client IP from the request.
 * Prefers the X-Forwarded-For header set by Vercel/proxies.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Check the rate limit for the given request.
 *
 * Returns null when the request is allowed.
 * Returns a NextResponse(429) when the limit is exceeded.
 *
 * @param request   - The incoming NextRequest.
 * @param namespace - Unique string identifying this endpoint (e.g. 'checkout').
 * @param config    - Limit and window configuration.
 * @param requestId - The current request ID for inclusion in the error response.
 */
export function checkRateLimit(
  request: NextRequest,
  namespace: string,
  config: RateLimitConfig,
  requestId: string
): NextResponse | null {
  cleanup(config.windowMs);

  const ip = getClientIp(request);
  const key = `${namespace}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return null;
  }

  entry.count += 1;

  if (entry.count > config.limit) {
    const retryAfterSec = Math.ceil(
      (config.windowMs - (now - entry.windowStart)) / 1_000
    );
    return new NextResponse(
      JSON.stringify({
        success: false,
        requestId,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again shortly.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
        },
      }
    );
  }

  return null;
}
