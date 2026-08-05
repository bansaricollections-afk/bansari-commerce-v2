/**
 * RetryExecutor + CircuitBreaker + RetryPolicyRegistry
 *
 * RULES:
 *  1. CircuitBreaker is memory-only (per-instance). No distributed state.
 *     In serverless, circuit state resets on cold start — documented known limitation.
 *  2. No metrics, no adaptive thresholds, no dashboards.
 *  3. RetryPolicyRegistry is a static exported const — not a class, not a registry.
 *  4. RetryExecutor.execute() returns Result<T> — never throws for expected failures.
 *
 * @module retry-executor
 */
import type { Result } from '../types/commerce.types';
import { makeError } from '../types/commerce.errors';

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold:   number;
  /** Milliseconds to keep circuit OPEN before trying HALF_OPEN. Default: 30_000 */
  recoveryTimeoutMs:  number;
  /** Service name for logging/error messages. */
  serviceName:        string;
}

export class CircuitBreaker {
  private _state:            CircuitState = 'CLOSED';
  private _failureCount:     number       = 0;
  private _lastFailureAt:    number       = 0; // Date.getTime()

  private readonly _opts: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions) {
    this._opts = {
      failureThreshold:  opts.failureThreshold  ?? 5,
      recoveryTimeoutMs: opts.recoveryTimeoutMs ?? 30_000,
      serviceName:       opts.serviceName,
    };
  }

  get state(): CircuitState {
    return this._state;
  }

  /**
   * Returns true if the caller may proceed with the operation.
   * - CLOSED:     always allowed
   * - OPEN:       blocked unless recovery timeout has elapsed (transitions to HALF_OPEN)
   * - HALF_OPEN:  one probe allowed
   */
  canProceed(): boolean {
    if (this._state === 'CLOSED') return true;

    if (this._state === 'OPEN') {
      const elapsed = Date.now() - this._lastFailureAt;
      if (elapsed >= this._opts.recoveryTimeoutMs) {
        this._state = 'HALF_OPEN';
        return true; // probe attempt
      }
      return false;
    }

    // HALF_OPEN: allow the single probe through
    return true;
  }

  /** Call after a successful operation. Resets failure count and closes the circuit. */
  recordSuccess(): void {
    this._failureCount = 0;
    this._state = 'CLOSED';
    this._lastFailureAt = 0;
  }

  /** Call after a failed operation. May transition to OPEN. */
  recordFailure(): void {
    this._failureCount++;
    this._lastFailureAt = Date.now();

    if (this._state === 'HALF_OPEN') {
      // Probe failed — back to OPEN
      this._state = 'OPEN';
      return;
    }

    if (this._failureCount >= this._opts.failureThreshold) {
      this._state = 'OPEN';
    }
  }

  /** Reset to initial CLOSED state. Use in tests only. */
  reset(): void {
    this._state = 'CLOSED';
    this._failureCount = 0;
    this._lastFailureAt = 0;
  }

  get serviceName(): string {
    return this._opts.serviceName;
  }
}

// ---------------------------------------------------------------------------
// RetryExecutor
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  maxAttempts:    number;
  /** Base delay in ms. Each retry: delay * 2^(attempt-1) with optional jitter. */
  baseDelayMs:    number;
  /** Maximum delay cap in ms. Default: 30_000 */
  maxDelayMs:     number;
  /** Add ±20% jitter to avoid thundering herd. Default: true */
  jitter:         boolean;
  /** Predicate — return true to retry this error. Default: always retry. */
  isRetryable?:   (error: unknown) => boolean;
}

export interface RetryContext {
  attempt:       number;
  totalAttempts: number;
  lastError:     unknown;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(policy: RetryPolicy, attempt: number): number {
  const base  = policy.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(base, policy.maxDelayMs);
  if (!policy.jitter) return capped;
  // ±20% jitter
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

export class RetryExecutor {
  constructor(
    private readonly _policy:  RetryPolicy,
    private readonly _circuit?: CircuitBreaker
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<Result<T>> {
    for (let attempt = 1; attempt <= this._policy.maxAttempts; attempt++) {
      // Circuit breaker check
      if (this._circuit && !this._circuit.canProceed()) {
        return {
          success: false,
          error:   makeError(
            'CIRCUIT_OPEN',
            `Circuit is OPEN for service: ${this._circuit.serviceName}`
          ),
        };
      }

      try {
        const result = await fn();
        this._circuit?.recordSuccess();
        return { success: true, data: result };
      } catch (err: unknown) {
        this._circuit?.recordFailure();

        const isRetryable = this._policy.isRetryable
          ? this._policy.isRetryable(err)
          : true;

        const isLastAttempt = attempt === this._policy.maxAttempts;

        if (!isRetryable || isLastAttempt) {
          return {
            success: false,
            error:   makeError('INTERNAL_ERROR', 'RetryExecutor exhausted', { attempt }, err),
          };
        }

        await sleep(computeDelay(this._policy, attempt));
      }
    }

    // Should never reach here given the loop structure.
    return {
      success: false,
      error:   makeError('INTERNAL_ERROR', 'RetryExecutor: unexpected exit'),
    };
  }
}

// ---------------------------------------------------------------------------
// RetryPolicyRegistry — static, not dynamic
// ---------------------------------------------------------------------------

export const RetryPolicyRegistry = Object.freeze({
  /** For Razorpay API calls — payment is critical, retry conservatively. */
  GATEWAY: {
    maxAttempts:  3,
    baseDelayMs:  500,
    maxDelayMs:   5_000,
    jitter:       true,
  } satisfies RetryPolicy,

  /** For Supabase RPC calls — fast operations, short delays. */
  DATABASE_RPC: {
    maxAttempts:  3,
    baseDelayMs:  100,
    maxDelayMs:   2_000,
    jitter:       true,
  } satisfies RetryPolicy,

  /** For non-critical external calls (e.g. notification service). */
  NOTIFICATION: {
    maxAttempts:  2,
    baseDelayMs:  1_000,
    maxDelayMs:   10_000,
    jitter:       true,
  } satisfies RetryPolicy,
} as const);
