import { NextResponse } from 'next/server';

/**
 * Canonical API error response.
 *
 * Every API error MUST use this shape:
 *   { success: false, requestId, code, message }
 *
 * This guarantees clients can always type-narrow on `success` and always
 * have a correlatable `requestId` for support/log lookups.
 */
export type ApiErrorBody = {
  success: false;
  requestId: string;
  code: string;
  message: string;
};

export type ApiSuccessBody<T = Record<string, unknown>> = T & {
  success: true;
};

/**
 * Build a structured error NextResponse.
 *
 * @param requestId - The current request ID.
 * @param code      - Machine-readable error code (e.g. 'INVALID_SIGNATURE').
 * @param message   - Human-readable error message.
 * @param status    - HTTP status code (default 500).
 */
export function apiError(
  requestId: string,
  code: string,
  message: string,
  status = 500
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    { success: false, requestId, code, message },
    { status }
  );
}

/**
 * Build a structured success NextResponse.
 *
 * @param data   - Response payload (must NOT include a `success` key).
 * @param status - HTTP status code (default 200).
 */
export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json<ApiSuccessBody<T>>(
    { success: true, ...data },
    { status }
  );
}
