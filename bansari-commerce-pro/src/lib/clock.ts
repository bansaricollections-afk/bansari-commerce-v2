/**
 * Clock abstraction.
 *
 * WHY: Date.now() and new Date() are banned inside checkout services.
 * Injecting a Clock makes time deterministic in tests and auditable in production.
 *
 * PRODUCTION:  inject SystemClock (or use the default export)
 * TESTS:       inject FakeClock — advance time explicitly, no real timers
 *
 * @module clock
 */

export interface Clock {
  /** Returns the current instant. */
  now(): Date;
}

// ---------------------------------------------------------------------------
// Production implementation
// ---------------------------------------------------------------------------

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Singleton for production use — import and pass directly. */
export const systemClock: Clock = new SystemClock();

// ---------------------------------------------------------------------------
// Test implementation
// ---------------------------------------------------------------------------

/**
 * FakeClock — deterministic time control for unit and integration tests.
 *
 * Usage:
 *   const clock = new FakeClock(new Date('2026-08-06T00:00:00Z'));
 *   clock.advance(minutes(5));   // advance by 5 minutes
 *   clock.set(new Date('...'));  // jump to absolute instant
 */
export class FakeClock implements Clock {
  private _current: Date;

  constructor(start: Date = new Date('2026-01-01T00:00:00.000Z')) {
    this._current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this._current.getTime()); // always return a copy
  }

  /** Advance the clock by the given number of milliseconds. */
  advance(ms: number): void {
    this._current = new Date(this._current.getTime() + ms);
  }

  /** Jump to an absolute instant. */
  set(date: Date): void {
    this._current = new Date(date.getTime());
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers for use with FakeClock.advance()
// ---------------------------------------------------------------------------

export const seconds = (n: number): number => n * 1_000;
export const minutes = (n: number): number => n * 60 * 1_000;
export const hours   = (n: number): number => n * 60 * 60 * 1_000;
