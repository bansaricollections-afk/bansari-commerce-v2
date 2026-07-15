import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  updatePaymentStatusFromWebhook,
  recoverOrderFromWebhook,
  type RazorpayPaymentEntity,
} from "@/services/order.service";
import { sendOrderConfirmationEmail } from "@/services/email.service";

const HANDLED_EVENTS = new Set(["payment.captured", "payment.failed"]);

/**
 * Fetch full payment details from the Razorpay REST API.
 *
 * Required for webhook recovery: the webhook payload contains only a
 * subset of payment fields.  We need email, contact, and notes to
 * reconstruct the order when the browser never reached /api/orders/create.
 */
async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentEntity | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error(
      "[webhook] Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — cannot fetch payment details for recovery."
    );
    return null;
  }

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[webhook] Razorpay fetch payment ${paymentId} returned ${response.status}: ${text}`
      );
      return null;
    }

    return (await response.json()) as RazorpayPaymentEntity;
  } catch (err) {
    console.error(
      `[webhook] Failed to fetch payment ${paymentId} from Razorpay:`,
      err
    );
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Signature verification requires the exact raw body bytes — parsing via
  // request.json() first would lose that, so read as text and verify
  // before ever attempting to interpret it as JSON.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let event: unknown;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!event || typeof event !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  const eventType = (event as Record<string, unknown>).event;

  if (typeof eventType !== "string" || !HANDLED_EVENTS.has(eventType)) {
    // Acknowledge unhandled event types with 2xx so Razorpay doesn't retry
    // deliveries we have no handling for.
    return NextResponse.json(
      { success: true, handled: false },
      { status: 200 }
    );
  }

  const payload = (event as Record<string, unknown>).payload as
    | Record<string, unknown>
    | undefined;
  const payment = payload?.payment as Record<string, unknown> | undefined;
  const entity = payment?.entity as Record<string, unknown> | undefined;
  const paymentId = entity?.id;

  if (typeof paymentId !== "string" || paymentId.length === 0) {
    return NextResponse.json(
      { success: false, error: "Webhook payload is missing a payment id." },
      { status: 400 }
    );
  }

  try {
    const status = eventType === "payment.captured" ? "paid" : "failed";

    // --- payment.captured: attempt to update existing order ---
    // --- if no order exists, recover it from Razorpay ----------
    const result = await updatePaymentStatusFromWebhook(paymentId, status);

    if (!result.updated && eventType === "payment.captured") {
      // The browser closed before /api/orders/create ran.
      // Attempt automatic recovery.
      console.warn(
        `[webhook] payment.captured for ${paymentId} — no matching order found. Starting recovery.`
      );

      // Fetch the full payment object from Razorpay to get contact details.
      const paymentDetails = await fetchRazorpayPayment(paymentId);

      if (!paymentDetails) {
        // Cannot recover without payment details.  Log critical alert.
        // Razorpay will retry the webhook delivery, so do NOT return 2xx
        // here — return 500 to trigger a retry.
        console.error(
          `[webhook] CRITICAL: payment.captured for ${paymentId} — recovery FAILED (could not fetch payment from Razorpay). Manual intervention required.`
        );
        return NextResponse.json(
          { success: false, error: "Could not fetch payment details for recovery." },
          { status: 500 }
        );
      }

      const recovery = await recoverOrderFromWebhook(paymentDetails);

      if (!recovery.recovered) {
        console.error(
          `[webhook] CRITICAL: payment.captured for ${paymentId} — recovery FAILED: ${
            recovery.error
          }. Manual intervention required.`
        );
        // Return 500 so Razorpay retries delivery.
        return NextResponse.json(
          { success: false, error: "Order recovery failed." },
          { status: 500 }
        );
      }

      console.warn(
        `[webhook] Recovery succeeded — created order ${recovery.orderId} for payment ${paymentId}.`
      );

      // Send a best-effort confirmation email using whatever contact
      // information is available from the Razorpay payment object.
      // Non-fatal: failure only logs a warning.
      try {
        const customerEmail = paymentDetails.email;
        const customerName =
          paymentDetails.notes?.customer_name ?? "Customer";
        const grandTotal = Math.round((paymentDetails.amount / 100) * 100) / 100;

        if (customerEmail) {
          // Determine what order number was created.
          // We pass a dummy order number derived from the recovery result
          // since we only have the UUID from recoverOrderFromWebhook.
          // The email is best-effort in the recovery path.
          await sendOrderConfirmationEmail({
            orderNumber: recovery.orderId ?? paymentId,
            customerName,
            customerEmail,
            items: [],           // item detail unavailable in recovery path
            subtotal: grandTotal,
            shippingFee: 0,
            discount: 0,
            grandTotal,
            shippingAddress: {
              addressLine1: "Please contact us to confirm your delivery address.",
              city: "",
              state: "",
              postalCode: "",
            },
          });
        }
      } catch (emailErr) {
        console.warn(
          `[webhook] Recovery email failed for payment ${paymentId}:`,
          emailErr
        );
      }
    } else if (!result.updated && eventType === "payment.failed") {
      // Failed payment with no order row is expected when the customer
      // abandoned before order creation.  Not an error.
      console.warn(
        `[webhook] payment.failed for ${paymentId} — no matching order row (expected for pre-order failures).`
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process webhook.",
      },
      { status: 500 }
    );
  }

  // 200 for all successfully handled events (including recovery success
  // and payment.failed with no matching order).
  return NextResponse.json(
    { success: true, handled: true },
    { status: 200 }
  );
}
