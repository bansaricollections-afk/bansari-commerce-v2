/**
 * cashfree.ts
 * -----------
 * Server-only Cashfree Payment Gateway client.
 *
 * Pure HTTP + crypto. No database, no React, no browser APIs. Every function
 * here runs on the server and reads CASHFREE_KEY_SECRET — this module must
 * never be imported into a client component. There is deliberately no
 * NEXT_PUBLIC_* Cashfree variable anywhere.
 *
 * API surface pinned to the verified current version (2026-01-01):
 *   - POST /pg/orders                      create order        -> payment_session_id, cf_order_id
 *   - GET  /pg/orders/{order_id}           order status        -> order_status (PAID = settled)
 *   - GET  /pg/orders/{order_id}/payments  transaction status  -> cf_payment_id, payment_status
 *   - webhook signature: Base64(HMACSHA256(timestamp + rawBody, secret))
 *
 * Razorpay's lib/razorpay.ts is left completely untouched; this is a parallel
 * client so the Razorpay rollback path keeps working.
 */
import crypto from 'crypto';

export const CASHFREE_API_VERSION = '2026-01-01';

/** Cashfree order lifecycle. PAID is the only state that means "settled". */
export type CashfreeOrderStatus =
  | 'ACTIVE'
  | 'PAID'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'TERMINATION_REQUESTED';

/** Per-transaction status. SUCCESS is the only state that means "captured". */
export type CashfreePaymentStatus =
  | 'SUCCESS'
  | 'NOT_ATTEMPTED'
  | 'FAILED'
  | 'USER_DROPPED'
  | 'VOID'
  | 'CANCELLED'
  | 'PENDING';

type CashfreeConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  /** 'sandbox' | 'production' — mirrored to the browser SDK's mode. */
  mode: 'sandbox' | 'production';
};

/**
 * Resolve credentials and environment. Throws a clear, non-sensitive error if
 * anything is missing so a misconfigured deploy fails loudly at the first
 * Cashfree call instead of silently charging through the wrong path.
 *
 * CASHFREE_ENV selects sandbox vs production and defaults to 'sandbox' — the
 * safe default, so production credentials are never hit unless the deploy
 * explicitly opts in.
 */
export function cashfreeConfig(): CashfreeConfig {
  const clientId = process.env.CASHFREE_KEY_ID;
  const clientSecret = process.env.CASHFREE_KEY_SECRET;
  const env = (process.env.CASHFREE_ENV ?? 'sandbox').toLowerCase();

  if (!clientId || !clientSecret) {
    throw new Error(
      '[Cashfree] Missing CASHFREE_KEY_ID or CASHFREE_KEY_SECRET. ' +
        'Payment cannot proceed until both are configured server-side.'
    );
  }

  const mode = env === 'production' ? 'production' : 'sandbox';
  const baseUrl =
    mode === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  return { clientId, clientSecret, baseUrl, mode };
}

/** Public (non-secret) view for the client SDK: which mode to run in. */
export function cashfreeMode(): 'sandbox' | 'production' {
  return cashfreeConfig().mode;
}

function authHeaders(cfg: CashfreeConfig): Record<string, string> {
  return {
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': cfg.clientId,
    'x-client-secret': cfg.clientSecret,
    'Content-Type': 'application/json',
  };
}

/**
 * Format a rupee amount for Cashfree's `order_amount`.
 *
 * CRITICAL: Cashfree is rupee-denominated. This is NOT paise — there is no
 * ×100 here, unlike Razorpay. The guards reject anything that could mangle a
 * charge: non-finite, <= 0, or NaN. Two-decimal rounding matches Cashfree's
 * accepted precision.
 */
export function toCashfreeAmount(rupees: number): number {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
    throw new Error('[Cashfree] order_amount is not a finite number.');
  }
  if (rupees <= 0) {
    throw new Error('[Cashfree] order_amount must be greater than zero.');
  }
  const rounded = Math.round(rupees * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error('[Cashfree] order_amount failed rounding validation.');
  }
  return rounded;
}

export type CreateOrderInput = {
  /** Merchant order id — our reference, sent as `order_id`. Persisted as cf_order_id. */
  orderId: string;
  /** Authoritative rupee total (server-computed). Never a client value. */
  amount: number;
  currency: string;
  customer: { id: string; phone: string };
  returnUrl?: string;
  notifyUrl?: string;
};

export type CreateOrderResult = {
  cfOrderId: string | null;
  paymentSessionId: string;
  orderStatus: CashfreeOrderStatus;
};

/** POST /pg/orders — create an order and obtain a payment session. */
export async function createCashfreeOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const cfg = cashfreeConfig();

  const body: Record<string, unknown> = {
    order_id: input.orderId,
    order_amount: toCashfreeAmount(input.amount),
    order_currency: input.currency,
    customer_details: {
      customer_id: input.customer.id,
      customer_phone: input.customer.phone,
    },
  };

  if (input.returnUrl || input.notifyUrl) {
    body.order_meta = {
      ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
      ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
    };
  }

  const res = await fetch(`${cfg.baseUrl}/orders`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || typeof json.payment_session_id !== 'string') {
    const message =
      typeof json.message === 'string' ? json.message : `HTTP ${res.status}`;
    throw new Error(`[Cashfree] create order failed: ${message}`);
  }

  return {
    cfOrderId: typeof json.cf_order_id === 'string' ? json.cf_order_id : null,
    paymentSessionId: json.payment_session_id,
    orderStatus: json.order_status as CashfreeOrderStatus,
  };
}

export type CashfreeOrder = {
  orderId: string;
  cfOrderId: string | null;
  orderStatus: CashfreeOrderStatus;
  orderAmount: number;
  orderCurrency: string;
};

/** GET /pg/orders/{order_id} — authoritative order status. */
export async function getCashfreeOrder(orderId: string): Promise<CashfreeOrder> {
  const cfg = cashfreeConfig();

  const res = await fetch(
    `${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}`,
    { method: 'GET', headers: authHeaders(cfg) }
  );

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || typeof json.order_status !== 'string') {
    const message =
      typeof json.message === 'string' ? json.message : `HTTP ${res.status}`;
    throw new Error(`[Cashfree] get order failed: ${message}`);
  }

  return {
    orderId: String(json.order_id ?? orderId),
    cfOrderId: typeof json.cf_order_id === 'string' ? json.cf_order_id : null,
    orderStatus: json.order_status as CashfreeOrderStatus,
    orderAmount: Number(json.order_amount ?? 0),
    orderCurrency: String(json.order_currency ?? ''),
  };
}

export type CashfreePayment = {
  cfPaymentId: string;
  paymentStatus: CashfreePaymentStatus;
  paymentAmount: number;
};

/** GET /pg/orders/{order_id}/payments — per-transaction records for the order. */
export async function getCashfreePayments(
  orderId: string
): Promise<CashfreePayment[]> {
  const cfg = cashfreeConfig();

  const res = await fetch(
    `${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    { method: 'GET', headers: authHeaders(cfg) }
  );

  const json = (await res.json().catch(() => [])) as unknown;

  if (!res.ok || !Array.isArray(json)) {
    throw new Error(`[Cashfree] get payments failed: HTTP ${res.status}`);
  }

  return json.map((p) => {
    const row = p as Record<string, unknown>;
    return {
      cfPaymentId: String(row.cf_payment_id ?? ''),
      paymentStatus: row.payment_status as CashfreePaymentStatus,
      paymentAmount: Number(row.payment_amount ?? 0),
    };
  });
}

/**
 * Verify a Cashfree webhook signature.
 *
 * Cashfree signs `timestamp + rawBody` (the UNPARSED body) with the client
 * secret: Base64(HMACSHA256(timestamp + rawBody, secret)). The caller MUST
 * pass the raw request text — re-serialising parsed JSON changes byte order
 * and breaks verification.
 *
 * Compared in constant time. Length-guarded first so timingSafeEqual never
 * throws on a mismatched buffer size.
 */
/**
 * How old a webhook may be before it is treated as a replay.
 *
 * Deliberately generous. The signature covers the timestamp, so an attacker
 * cannot forge a fresh one — this only needs to bound how long a CAPTURED
 * webhook stays useful. 15 minutes absorbs clock skew and provider retry
 * delays while shrinking the replay window from "forever" to a quarter hour.
 */
const WEBHOOK_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Is a Cashfree webhook timestamp recent enough to act on?
 *
 * WHY THIS IS SEPARATE FROM SIGNATURE VERIFICATION
 * A valid signature proves the payload came from Cashfree; it says nothing
 * about WHEN. Without a freshness bound, anyone who captures one valid webhook
 * can replay it indefinitely. It cannot fabricate a payment — the handler is
 * idempotent and re-fetches true status from Cashfree — but each replay forces
 * an outbound API call, which is a cheap denial-of-service against our own
 * rate budget.
 *
 * FAILS OPEN, ON PURPOSE
 * An unparseable or absent timestamp returns `true` (allow). This is safe
 * because the timestamp is INSIDE the signed payload: an attacker cannot alter
 * it without invalidating the signature, so any request reaching this check has
 * Cashfree's original value. Failing open therefore costs no security, and
 * avoids taking payments offline if the provider ever changes the format.
 * Money paths should not break on a defence-in-depth control.
 *
 * Accepts seconds or milliseconds — Cashfree documents epoch seconds, but the
 * magnitude test costs nothing and removes a whole class of unit bug.
 */
export function isCashfreeWebhookTimestampFresh(
  timestamp: string,
  now: number = Date.now()
): boolean {
  const raw = Number(timestamp);
  if (!Number.isFinite(raw) || raw <= 0) return true; // see FAILS OPEN above

  const ms = raw > 1e12 ? raw : raw * 1000;
  // Absolute difference, so a clock ahead of ours is bounded too.
  return Math.abs(now - ms) <= WEBHOOK_MAX_AGE_MS;
}

export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const cfg = cashfreeConfig();
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac('sha256', cfg.clientSecret)
    .update(timestamp + rawBody)
    .digest('base64');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
