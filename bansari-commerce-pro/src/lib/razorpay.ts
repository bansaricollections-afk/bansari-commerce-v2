import crypto from "crypto";

import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function getRazorpay() {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay environment variables: RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET."
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/**
 * verifyPaymentSignature
 *
 * Verifies the Razorpay checkout-side HMAC signature that the client
 * receives from Razorpay after a successful payment and forwards to
 * /api/orders/create.
 *
 * Razorpay signs the string `${order_id}|${payment_id}` using the API
 * key secret (RAZORPAY_KEY_SECRET) with HMAC-SHA256.
 *
 * This is intentionally DIFFERENT from verifyWebhookSignature:
 *   - Different secret  : RAZORPAY_KEY_SECRET  vs  RAZORPAY_WEBHOOK_SECRET
 *   - Different payload : `order_id|payment_id` vs  raw webhook body
 *
 * Returns false when:
 *   - RAZORPAY_KEY_SECRET is not configured
 *   - Signature lengths differ (timing-safe early exit)
 *   - HMAC comparison fails
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return false;
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(razorpaySignature, "hex");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * verifyWebhookSignature
 *
 * Verifies a Razorpay webhook delivery.
 *
 * This is a DIFFERENT secret and algorithm input from the checkout-side
 * signature check above: webhooks are signed over the raw request body
 * using a separate webhook secret (configured in the Razorpay Dashboard
 * specifically for the webhook endpoint), not `${order_id}|${payment_id}`
 * signed with the API key secret. Requires RAZORPAY_WEBHOOK_SECRET to be
 * set — not created by this change, must be added to the environment
 * separately.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
