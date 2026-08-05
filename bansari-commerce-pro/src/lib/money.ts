/**
 * Money — immutable value object for all financial arithmetic.
 *
 * RULES (enforced by this module):
 *  1. All internal storage is integer paise (100 paise = ₹1).
 *  2. Floats are NEVER stored. Every factory rounds to the nearest integer.
 *  3. subtract() floors at zero — Money cannot be negative in this domain.
 *  4. multiply() uses Math.round — no truncation bias.
 *  5. toString() / toRupees() are presentation helpers only.
 *     Do NOT use toRupees() for storage or comparison.
 *
 * Serialisation contract (JSONB / API transport):
 *   Store:  money.toPaise()          → integer  (e.g. 399900)
 *   Restore: Money.of(row.fieldInPaise)  → Money
 *
 * @module money
 */
export class Money {
  // Private constructor enforces factory usage.
  private constructor(private readonly _paise: number) {
    if (!Number.isInteger(_paise)) {
      throw new Error(`Money internal state must be an integer paise value, got: ${_paise}`);
    }
    if (_paise < 0) {
      throw new Error(`Money cannot be negative, got: ${_paise}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Factories
  // ---------------------------------------------------------------------------

  /** Primary factory. Accepts integer paise only. */
  static of(paise: number): Money {
    return new Money(Math.round(paise));
  }

  static zero(): Money {
    return new Money(0);
  }

  /**
   * Convert rupees (possibly fractional) to paise.
   * Use only at system boundaries (user input, catalog prices).
   * Internal arithmetic must use Money.of(paise).
   */
  static fromRupees(rupees: number): Money {
    return new Money(Math.round(rupees * 100));
  }

  // ---------------------------------------------------------------------------
  // Arithmetic — all return new immutable instances
  // ---------------------------------------------------------------------------

  add(other: Money): Money {
    return new Money(this._paise + other._paise);
  }

  /**
   * Subtract other from this.
   * Result is floored at zero — Money cannot be negative.
   * Callers that need to detect under-subtraction should call isGreaterThan first.
   */
  subtract(other: Money): Money {
    const result = this._paise - other._paise;
    return new Money(Math.max(0, result));
  }

  /**
   * Multiply by a scalar factor (e.g. tax rate 0.18, quantity 3).
   * Result is Math.round — no truncation bias.
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this._paise * factor));
  }

  // ---------------------------------------------------------------------------
  // Comparison
  // ---------------------------------------------------------------------------

  equals(other: Money): boolean {
    return this._paise === other._paise;
  }

  isZero(): boolean {
    return this._paise === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this._paise > other._paise;
  }

  isLessThan(other: Money): boolean {
    return this._paise < other._paise;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this._paise >= other._paise;
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  /** Storage / transport value. Store this integer in DB and JSON payloads. */
  toPaise(): number {
    return this._paise;
  }

  /** Presentation only — never use for storage or comparison. */
  toRupees(): number {
    return this._paise / 100;
  }

  /** Presentation only — e.g. "₹3,999.00" */
  toString(): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(this.toRupees());
  }

  toJSON(): number {
    return this._paise;
  }
}
