import crypto from 'crypto';

/**
 * Generate a cryptographically random request ID.
 * Used in structured logs, error responses, and the health endpoint.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
